document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('photo-sphere-container');
    const loadingIndicator = document.getElementById('loading-photos');
    const modalElement = document.getElementById('photo-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalCloseButton = document.querySelector('.photo-modal-close');
    const shallowerLayerBtn = document.getElementById('shallower-layer-btn');
    const deeperLayerBtn = document.getElementById('deeper-layer-btn');
    const photoNavControls = document.querySelector('.photo-navigation-controls');


    // 默认使用：https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main
    // 部署了pages之后：https://komorebi-yaodong.github.io/komorebiBlog
    // 反代：https://mypages.001412.xyz/komorebiBlog
    const repoUrl = 'https://mypages.001412.xyz/komorebiBlog';
    
    const urlParams = new URLSearchParams(window.location.search);
    const albumPath = urlParams.get('path');
    const albumName = decodeURIComponent(urlParams.get('name') || "相册");

    document.title = `${albumName} - Komorebi's Blog`;

    if (!albumPath) {
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `<div class="text-center mt-5">
                                            <p class='text-danger h4'>错误：未指定相册路径。</p>
                                            <a href='albums.html' class='btn btn-primary mt-3'>返回相册集</a>
                                          </div>`;
            loadingIndicator.style.display = 'block';
        }
        if (photoNavControls) photoNavControls.style.display = 'none';
        console.error("Album path not specified in URL.");
        return;
    }


    const PHOTOS_PER_ROW_TARGET = 4;
    const MAX_ROWS_PER_LAYER = 3;
    const LAYER_DEPTH_SPACING = 35;
    const PHOTO_BASE_HEIGHT = 3.0;
    const PHOTO_ASPECT_RATIO_SPACING_FACTOR = 1.25;
    const PHOTO_VERTICAL_SPACING_FACTOR = 1.25;

    const CAMERA_FOV = 60;
    const CAMERA_DEFAULT_VIEW_Z_OFFSET = PHOTO_BASE_HEIGHT * MAX_ROWS_PER_LAYER * PHOTO_VERTICAL_SPACING_FACTOR * 1.3;
    const CAMERA_ZOOM_RANGE_FACTOR = 0.6;

    const SMOOTHING_FACTOR_CAMERA_POS = 0.06;
    const SMOOTHING_FACTOR_CAMERA_LOOKAT = 0.07;
    const MOUSE_WHEEL_SENSITIVITY_LAYER_ZOOM = 0.045;

    const CULLING_BEHIND_CAMERA_OFFSET = 1;

    let scene, camera, renderer, raycaster, mouseNDC;
    let photoMeshes = [];
    let layers = [];

    let currentFocusedLayerIndex = 0;
    let targetCameraX, currentCameraX;
    let targetCameraY, currentCameraY;
    let targetCameraZ, currentCameraZ;
    let targetLookAtX, currentLookAtX;
    let targetLookAtY, currentLookAtY;
    let targetLookAtZ, currentLookAtZ;

    let controlsEnabled = true;
    const invisibleLayerPlane = new THREE.Plane();
    const intersectionPoint = new THREE.Vector3();

    function init3D() {
        if (!container || !shallowerLayerBtn || !deeperLayerBtn) {
            if (loadingIndicator) loadingIndicator.innerHTML = "<p class='text-center mt-5 text-danger'>页面初始化错误。</p>";
            return;
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(CAMERA_FOV, container.clientWidth / container.clientHeight, 0.1, LAYER_DEPTH_SPACING * 20);
        
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding; 
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4); 
        directionalLight.position.set(5, 10, 30);
        scene.add(directionalLight);

        raycaster = new THREE.Raycaster();
        mouseNDC = new THREE.Vector2();

        targetCameraX = currentCameraX = 0;
        targetCameraY = currentCameraY = 0;
        targetLookAtX = currentLookAtX = 0;
        targetLookAtY = currentLookAtY = 0;

        loadPhotosAndSetupScene();
        setupEventListeners();
    }

    async function loadPhotosAndSetupScene() {
        try {
            const fetchUrl = `${repoUrl}/${albumPath.startsWith('/') ? albumPath.substring(1) : albumPath}`;
            const response = await fetch(fetchUrl, { cache: "no-cache" });
            if (!response.ok) throw new Error(`获取相册照片列表失败 (${response.status}) <br/><small>路径: ${albumPath}</small>`);
            
            const rawPhotos = await response.json();
            if (!rawPhotos || rawPhotos.length === 0) {
                if (loadingIndicator) loadingIndicator.innerHTML = `<p class='text-muted text-center mt-5 lead'>此相册中没有照片。<br><a href='albums.html' class='btn btn-secondary mt-3 btn-sm'>返回相册集</a></p>`;
                updateNavButtons();
                if (photoNavControls) photoNavControls.style.display = 'none';
                return;
            }

            const sortedPhotos = rawPhotos.map((photo, index) => ({ ...photo, originalIndex: index }));
            sortPhotosByTimeAndIndex(sortedPhotos);
            
            await createLayersFromPhotos(sortedPhotos);

            if (layers.length > 0) {
                currentFocusedLayerIndex = 0;
                setCameraFocusForLayer(currentFocusedLayerIndex, true);
            } else {
                // This case should be covered by "rawPhotos.length === 0" or if createLayersFromPhotos fails to add any.
                targetCameraZ = currentCameraZ = CAMERA_DEFAULT_VIEW_Z_OFFSET;
                targetLookAtZ = currentLookAtZ = 0;
                camera.position.set(0, 0, currentCameraZ);
                camera.lookAt(0, 0, currentLookAtZ);
            }
            
            updateNavButtons();
            if (photoNavControls && layers.length > 0) photoNavControls.style.display = 'flex'; // Show controls if photos exist
            else if (photoNavControls) photoNavControls.style.display = 'none';

            if (loadingIndicator) loadingIndicator.style.display = 'none';
            animate();

        } catch (error) {
            console.error("Error loading photos for album:", error);
            if (loadingIndicator) loadingIndicator.innerHTML = `<div class="alert alert-danger text-center mt-5">
                                                                    <p class="h5">加载照片时出错:</p>
                                                                    <p class="mb-0">${error.message}</p>
                                                                    <a href='albums.html' class='btn btn-primary mt-3'>返回相册集</a>
                                                                </div>`;
            updateNavButtons();
            if (photoNavControls) photoNavControls.style.display = 'none';
        }
    }

    function sortPhotosByTimeAndIndex(photos) {
        photos.sort((a, b) => {
            const timeA = a.time ? new Date(a.time).getTime() : null;
            const timeB = b.time ? new Date(b.time).getTime() : null;
            if (timeA !== null && timeB !== null) {
                if (timeA !== timeB) return timeB - timeA;
            } else if (timeA !== null) return -1;
            else if (timeB !== null) return 1;
            return b.originalIndex - a.originalIndex;
        });
    }

    async function createLayersFromPhotos(allSortedPhotos) {
        const textureLoader = new THREE.TextureLoader();
        let photoIndex = 0;
        let currentLayerZ = 0;

        while (photoIndex < allSortedPhotos.length) {
            const layerGroup = new THREE.Group();
            layerGroup.position.z = currentLayerZ;
            scene.add(layerGroup);
            
            let layerPhotoMeshes = [];
            const maxPhotosForThisDepthLayer = MAX_ROWS_PER_LAYER * PHOTOS_PER_ROW_TARGET;
            const photosToProcessForDepthLayer = allSortedPhotos.slice(photoIndex, photoIndex + maxPhotosForThisDepthLayer);
            let photosActuallyAddedToLayer = 0;
            let currentYForRowBlock = 0;

            for (let r = 0; r < MAX_ROWS_PER_LAYER && photosActuallyAddedToLayer < photosToProcessForDepthLayer.length; r++) {
                let currentX = 0;
                let photosInThisRow = 0;
                
                const startIndexForRow = photosActuallyAddedToLayer;
                let totalWidthOfThisRow = 0;
                let firstPhotoInRowWidth = 0;
                let numPhotosThisRowCanFit = 0;

                for (let c_calc = 0; c_calc < PHOTOS_PER_ROW_TARGET; c_calc++) {
                    const pIdx_calc = startIndexForRow + c_calc;
                    if (pIdx_calc >= photosToProcessForDepthLayer.length) break;
                    const photoData_calc = photosToProcessForDepthLayer[pIdx_calc];
                    try {
                        const tempTexture = await textureLoader.loadAsync(resolveImageUrl(photoData_calc.image));
                        const aspectRatio = tempTexture.image.width / tempTexture.image.height || 1;
                        const pWidth = PHOTO_BASE_HEIGHT * aspectRatio;
                        totalWidthOfThisRow += pWidth;
                        if (c_calc < PHOTOS_PER_ROW_TARGET - 1 && (pIdx_calc + 1 < photosToProcessForDepthLayer.length)) {
                             totalWidthOfThisRow += pWidth * (PHOTO_ASPECT_RATIO_SPACING_FACTOR - 1);
                        }
                        if (c_calc === 0) firstPhotoInRowWidth = pWidth;
                        numPhotosThisRowCanFit++;
                    } catch(e) { /* skip */ }
                }
                currentX = -totalWidthOfThisRow / 2 + firstPhotoInRowWidth / 2;
                
                if (r > 0) {
                    currentYForRowBlock -= (PHOTO_BASE_HEIGHT * PHOTO_VERTICAL_SPACING_FACTOR);
                }

                for (let c = 0; c < numPhotosThisRowCanFit; c++) {
                    const currentPhotoOverallIndex = photosActuallyAddedToLayer;
                    const photoData = photosToProcessForDepthLayer[currentPhotoOverallIndex];
                    const imageUrl = resolveImageUrl(photoData.image);

                    try {
                        const texture = await textureLoader.loadAsync(imageUrl);
                        texture.encoding = THREE.sRGBEncoding; 
                        const aspectRatio = texture.image.width / texture.image.height || 1;
                        
                        const planeHeight = PHOTO_BASE_HEIGHT;
                        const planeWidth = planeHeight * aspectRatio;

                        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                        const material = new THREE.MeshLambertMaterial({ map: texture, side: THREE.FrontSide });
                        const mesh = new THREE.Mesh(geometry, material);

                        mesh.position.x = currentX;
                        mesh.position.y = currentYForRowBlock;
                        
                        mesh.userData = { ...photoData, resolvedImageUrl: imageUrl, layerZ: currentLayerZ };
                        layerGroup.add(mesh);
                        photoMeshes.push(mesh);
                        layerPhotoMeshes.push(mesh);
                        photosActuallyAddedToLayer++;
                        photosInThisRow++;
                        
                        currentX += planeWidth/2;
                        if (c < numPhotosThisRowCanFit - 1) {
                            const nextPhotoData = photosToProcessForDepthLayer[photosActuallyAddedToLayer]; // This should be the next photo
                             if(nextPhotoData && nextPhotoData.image) { // Check if nextPhotoData and its image exist
                                const nextTexture = await textureLoader.loadAsync(resolveImageUrl(nextPhotoData.image));
                                nextTexture.encoding = THREE.sRGBEncoding; 
                                const nextAspectRatio = nextTexture.image.width / nextTexture.image.height || 1;
                                const nextPlaneWidth = PHOTO_BASE_HEIGHT * nextAspectRatio;
                                currentX += (planeWidth / 2 * (PHOTO_ASPECT_RATIO_SPACING_FACTOR - 1)) + (nextPlaneWidth / 2);
                            } else {
                                // If there's no next photo, just add spacing based on current photo
                                currentX += (planeWidth / 2 * (PHOTO_ASPECT_RATIO_SPACING_FACTOR - 1));
                            }
                        }
                    } catch (e) {
                        console.warn(`Could not load image ${imageUrl}:`, e);
                        // Increment photosActuallyAddedToLayer even on error to advance through the photo list
                        // and prevent infinite loops if an image consistently fails.
                        photosActuallyAddedToLayer++; 
                    }
                }
                if (photosInThisRow === 0 && r > 0) { // No photos could be added to this row, break row loop.
                    currentYForRowBlock += (PHOTO_BASE_HEIGHT * PHOTO_VERTICAL_SPACING_FACTOR); // Revert Y decrement
                    break; 
                }
            }
            if (layerPhotoMeshes.length > 0) {
                const box = new THREE.Box3().setFromObject(layerGroup);
                const center = new THREE.Vector3();
                box.getCenter(center);
                layerGroup.position.y = -center.y; // Center the entire layer group vertically
            }

            layers.push({ z: currentLayerZ, group: layerGroup, photosInLayer: photosActuallyAddedToLayer });
            photoIndex += photosActuallyAddedToLayer;
            // If no photos were added to this layer but there are still photos left,
            // advance photoIndex to prevent an infinite loop (e.g., if all remaining photos fail to load).
            if (photosActuallyAddedToLayer === 0 && photoIndex < allSortedPhotos.length) {
                 photoIndex = Math.min(photoIndex + maxPhotosForThisDepthLayer, allSortedPhotos.length);
            }
            currentLayerZ -= LAYER_DEPTH_SPACING;
        }
    }

    function resolveImageUrl(path) {
        if (!path) return ''; // Handle undefined or null path
        if (!path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:')) {
            return `${repoUrl}/${path.replace(/^\.?\//, '')}`;
        }
        return path;
    }

    function setCameraFocusForLayer(layerIndex, isInitialSetup = false) {
        if (layerIndex < 0 || layerIndex >= layers.length) return;
        
        currentFocusedLayerIndex = layerIndex;
        const focusedLayerZ = layers[currentFocusedLayerIndex].z;

        targetCameraX = 0; 
        targetCameraY = 0; 
        targetCameraZ = focusedLayerZ + CAMERA_DEFAULT_VIEW_Z_OFFSET;
        targetLookAtX = 0;
        targetLookAtY = 0;
        targetLookAtZ = focusedLayerZ;

        if (isInitialSetup) {
            currentCameraX = targetCameraX;
            currentCameraY = targetCameraY;
            currentCameraZ = targetCameraZ;
            currentLookAtX = targetLookAtX;
            currentLookAtY = targetLookAtY;
            currentLookAtZ = targetLookAtZ;
            camera.position.set(currentCameraX, currentCameraY, currentCameraZ);
            camera.lookAt(currentLookAtX, currentLookAtY, currentLookAtZ);
        }
        updateNavButtons();
        updateLayerVisibility();
    }
    
    function animate() {
        requestAnimationFrame(animate);

        currentCameraX += (targetCameraX - currentCameraX) * SMOOTHING_FACTOR_CAMERA_POS;
        currentCameraY += (targetCameraY - currentCameraY) * SMOOTHING_FACTOR_CAMERA_POS;
        currentCameraZ += (targetCameraZ - currentCameraZ) * SMOOTHING_FACTOR_CAMERA_POS;
        
        currentLookAtX += (targetLookAtX - currentLookAtX) * SMOOTHING_FACTOR_CAMERA_LOOKAT;
        currentLookAtY += (targetLookAtY - currentLookAtY) * SMOOTHING_FACTOR_CAMERA_LOOKAT;
        currentLookAtZ += (targetLookAtZ - currentLookAtZ) * SMOOTHING_FACTOR_CAMERA_LOOKAT;

        camera.position.set(currentCameraX, currentCameraY, currentCameraZ);
        camera.lookAt(currentLookAtX, currentLookAtY, currentLookAtZ);
        
        updateLayerVisibility();
        if (renderer && scene && camera) renderer.render(scene, camera); // Ensure renderer is initialized
    }

    function updateLayerVisibility() {
        if (!layers.length || !camera) return; // Add camera check
        layers.forEach(layer => {
            if (layer.group) { // Check if group exists
                layer.group.visible = layer.z < currentCameraZ - CULLING_BEHIND_CAMERA_OFFSET;
            }
        });
    }

    function updateNavButtons() {
        if (!shallowerLayerBtn || !deeperLayerBtn) return;
        shallowerLayerBtn.disabled = (layers.length === 0 || currentFocusedLayerIndex === 0);
        deeperLayerBtn.disabled = (layers.length === 0 || currentFocusedLayerIndex >= layers.length - 1);
    }

    function setupEventListeners() {
        window.addEventListener('resize', onWindowResize, false);
        if (container) { // Check if container exists before adding event listeners
           container.addEventListener('wheel', onMouseWheel, { passive: false });
           container.addEventListener('click', onClick, false);
        }
        
        if (shallowerLayerBtn) shallowerLayerBtn.addEventListener('click', () => {
            if (currentFocusedLayerIndex > 0) {
                setCameraFocusForLayer(currentFocusedLayerIndex - 1);
            }
        });
        if (deeperLayerBtn) deeperLayerBtn.addEventListener('click', () => {
            if (currentFocusedLayerIndex < layers.length - 1) {
                setCameraFocusForLayer(currentFocusedLayerIndex + 1);
            }
        });

        if (modalCloseButton) modalCloseButton.addEventListener('click', hideModal);
        if (modalElement) modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) hideModal();
        });
    }

    function onWindowResize() {
        if (!renderer || !camera || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function onMouseWheel(event) {
        if (!controlsEnabled || layers.length === 0 || !camera || !renderer) return; // Add camera/renderer checks
        event.preventDefault();

        const delta = event.deltaY * (event.deltaMode === 1 ? 33 : 1);
        const focusedLayerZ = layers[currentFocusedLayerIndex].z;
        
        const oldDistToLayerPlane = currentCameraZ - focusedLayerZ;
        let newTargetRelativeDist = oldDistToLayerPlane + (delta * MOUSE_WHEEL_SENSITIVITY_LAYER_ZOOM);

        const minZoomDist = CAMERA_DEFAULT_VIEW_Z_OFFSET * (1 - CAMERA_ZOOM_RANGE_FACTOR);
        const maxZoomDist = CAMERA_DEFAULT_VIEW_Z_OFFSET * (1 + CAMERA_ZOOM_RANGE_FACTOR);
        newTargetRelativeDist = THREE.MathUtils.clamp(newTargetRelativeDist, minZoomDist, maxZoomDist);
        
        const newTargetCameraZ = focusedLayerZ + newTargetRelativeDist;

        mouseNDC.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouseNDC.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
        
        invisibleLayerPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0,0,focusedLayerZ));
        raycaster.setFromCamera(mouseNDC, camera);
        
        if (raycaster.ray.intersectPlane(invisibleLayerPlane, intersectionPoint)) {
            const worldMouseX = intersectionPoint.x;
            const worldMouseY = intersectionPoint.y;

            targetCameraX = worldMouseX - ( (worldMouseX - currentCameraX) / oldDistToLayerPlane ) * newTargetRelativeDist;
            targetCameraY = worldMouseY - ( (worldMouseY - currentCameraY) / oldDistToLayerPlane ) * newTargetRelativeDist;
            targetLookAtX = targetCameraX;
            targetLookAtY = targetCameraY;
        } else {
            targetCameraX = currentCameraX * (newTargetRelativeDist / oldDistToLayerPlane);
            targetCameraY = currentCameraY * (newTargetRelativeDist / oldDistToLayerPlane);
            targetLookAtX = targetCameraX;
            targetLookAtY = targetCameraY;
        }
        targetCameraZ = newTargetCameraZ;
        targetLookAtZ = focusedLayerZ;
    }

    function onClick(event) {
        if (!controlsEnabled || !camera || !renderer) return; // Add camera/renderer checks
        event.preventDefault();

        mouseNDC.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouseNDC.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        const visiblePhotoMeshes = photoMeshes.filter(m => m.parent && m.parent.visible && m.visible);
        const intersects = raycaster.intersectObjects(visiblePhotoMeshes);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            showModal(clickedObject.userData);
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return null;
        }
    }

    function showModal(data) {
        const modalTimeElement = document.getElementById('modal-time');
        const modalTimeContainer = document.getElementById('modal-time-container');

        if (!modalElement || !modalImage || !modalTitle || !modalDescription || !modalTimeElement || !modalTimeContainer) return;
        
        modalImage.src = data.resolvedImageUrl;
        modalImage.alt = data.title || "Photo";
        modalTitle.textContent = data.title || "";
        modalDescription.textContent = data.description || "";

        if (data.time) {
            const formattedTime = formatDate(data.time);
            if (formattedTime) {
                modalTimeElement.textContent = formattedTime;
                modalTimeContainer.style.display = 'block';
            } else {
                modalTimeContainer.style.display = 'none';
            }
        } else {
            modalTimeContainer.style.display = 'none';
        }
        
        modalElement.classList.add('show');
        controlsEnabled = false;
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        if (!modalElement) return;
        modalElement.classList.remove('show');
        controlsEnabled = true;
        document.body.style.overflow = '';
    }

    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }
    
    // Only initialize 3D if albumPath is valid
    if (albumPath) {
        init3D();
    }
});
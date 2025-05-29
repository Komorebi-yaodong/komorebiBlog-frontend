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
    const repoUrl = 'https://komorebi-yaodong.github.io/komorebiBlog';
    
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
    // PHOTO_ASPECT_RATIO_SPACING_FACTOR: Defines the space between photo centers relative to their half-widths.
    // If 1.0, centers are adjacent. If > 1.0, there's a gap.
    // Example: If 1.25, gap between photo A and B is (widthA/2 * 0.25) + (widthB/2 * 0.25)
    const PHOTO_ASPECT_RATIO_SPACING_FACTOR = 1.25; 
    const PHOTO_VERTICAL_SPACING_FACTOR = 1.25; // Multiplier for vertical spacing based on PHOTO_BASE_HEIGHT

    // Define a fixed aspect ratio for the layout slots
    const FIXED_SLOT_ASPECT_RATIO = 4 / 3; // Common aspect ratio (e.g., 4:3, 16:9, or 1.0 for square)
    const FIXED_SLOT_WIDTH = PHOTO_BASE_HEIGHT * FIXED_SLOT_ASPECT_RATIO;


    const CAMERA_FOV = 60;
    const CAMERA_DEFAULT_VIEW_Z_OFFSET = PHOTO_BASE_HEIGHT * MAX_ROWS_PER_LAYER * PHOTO_VERTICAL_SPACING_FACTOR * 1.3;
    const CAMERA_ZOOM_RANGE_FACTOR = 0.6;

    const SMOOTHING_FACTOR_CAMERA_POS = 0.06;
    const SMOOTHING_FACTOR_CAMERA_LOOKAT = 0.07;
    const MOUSE_WHEEL_SENSITIVITY_LAYER_ZOOM = 0.045;

    const CULLING_BEHIND_CAMERA_OFFSET = 1;

    let scene, camera, renderer, raycaster, mouseNDC;
    let photoMeshes = []; // Holds all photo meshes for raycasting
    let layers = []; // Holds layer data {z, group, photosInLayer}

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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); 
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
            
            createLayersFromPhotos(sortedPhotos); // This is now synchronous for layout

            if (layers.length > 0) {
                currentFocusedLayerIndex = 0;
                setCameraFocusForLayer(currentFocusedLayerIndex, true);
            } else {
                targetCameraZ = currentCameraZ = CAMERA_DEFAULT_VIEW_Z_OFFSET;
                targetLookAtZ = currentLookAtZ = 0;
                camera.position.set(0, 0, currentCameraZ);
                camera.lookAt(0, 0, currentLookAtZ);
            }
            
            updateNavButtons();
            if (photoNavControls && layers.length > 0) photoNavControls.style.display = 'flex';
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

    function createLayersFromPhotos(allSortedPhotos) {
        const textureLoader = new THREE.TextureLoader();
        let photoIndex = 0;
        let currentLayerZ = 0;

        const placeholderMaterialTemplate = new THREE.MeshLambertMaterial({
            color: 0x555555, 
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.3,
        });

        while (photoIndex < allSortedPhotos.length) {
            const layerGroup = new THREE.Group();
            layerGroup.position.z = currentLayerZ;
            scene.add(layerGroup);
            
            let photosPlacedInThisLayer = 0;
            let currentYForRowBlock = 0; // Y position for the current row, relative to layerGroup center

            for (let r = 0; r < MAX_ROWS_PER_LAYER; r++) {
                const photosInThisRowData = [];
                for (let c = 0; c < PHOTOS_PER_ROW_TARGET; c++) {
                    const overallIndex = photoIndex + (r * PHOTOS_PER_ROW_TARGET) + c;
                    if (overallIndex >= allSortedPhotos.length) break;
                    // Check if this photo still belongs to the current conceptual layer
                    if (photosPlacedInThisLayer >= MAX_ROWS_PER_LAYER * PHOTOS_PER_ROW_TARGET) break;
                    
                    photosInThisRowData.push(allSortedPhotos[overallIndex]);
                }

                if (photosInThisRowData.length === 0) break; // No more photos for this layer or row

                // Calculate total width of this row based on fixed slot sizes and spacing
                let totalWidthOfThisRow = 0;
                if (photosInThisRowData.length > 0) {
                    totalWidthOfThisRow = photosInThisRowData.length * FIXED_SLOT_WIDTH;
                    if (photosInThisRowData.length > 1) {
                        // The gap between two adjacent slots (center to center distance minus their widths)
                        // Distance between centers of slot A and slot B = (widthA/2 * Factor) + (widthB/2 * Factor)
                        // Since widthA = widthB = FIXED_SLOT_WIDTH, this is FIXED_SLOT_WIDTH * Factor
                        // Gap = (FIXED_SLOT_WIDTH * Factor) - FIXED_SLOT_WIDTH = FIXED_SLOT_WIDTH * (Factor - 1)
                        const gapBetweenSlots = FIXED_SLOT_WIDTH * (PHOTO_ASPECT_RATIO_SPACING_FACTOR - 1);
                        totalWidthOfThisRow += (photosInThisRowData.length - 1) * gapBetweenSlots;
                    }
                }
                
                // Starting X position for the center of the first photo in the row
                let currentX = -totalWidthOfThisRow / 2 + FIXED_SLOT_WIDTH / 2;

                for (let c = 0; c < photosInThisRowData.length; c++) {
                    const photoData = photosInThisRowData[c];
                    const imageUrl = resolveImageUrl(photoData.image);

                    const geometry = new THREE.PlaneGeometry(FIXED_SLOT_WIDTH, PHOTO_BASE_HEIGHT);
                    const material = placeholderMaterialTemplate.clone();
                    const mesh = new THREE.Mesh(geometry, material);

                    mesh.position.x = currentX;
                    mesh.position.y = currentYForRowBlock;
                    
                    mesh.userData = { ...photoData, resolvedImageUrl: imageUrl, layerZ: currentLayerZ, isLoading: true, loadError: false };
                    
                    layerGroup.add(mesh);
                    photoMeshes.push(mesh);
                    photosPlacedInThisLayer++;

                    textureLoader.load(
                        imageUrl,
                        (texture) => { // onLoad
                            texture.encoding = THREE.sRGBEncoding;
                            mesh.material.map = texture;
                            mesh.material.color.set(0xffffff); 
                            mesh.material.opacity = 1; 
                            
                            // Adjust texture repeat and offset to fit image into FIXED_SLOT_WIDTH/PHOTO_BASE_HEIGHT plane
                            texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
                            const imageAspect = texture.image.width / texture.image.height;
                            const planeAspect = FIXED_SLOT_WIDTH / PHOTO_BASE_HEIGHT; // Same as FIXED_SLOT_ASPECT_RATIO

                            if (imageAspect > planeAspect) { // Image wider than plane (fit height)
                                texture.repeat.set(planeAspect / imageAspect, 1);
                                texture.offset.set((1 - (planeAspect / imageAspect)) / 2, 0);
                            } else { // Image taller than plane (fit width)
                                texture.repeat.set(1, imageAspect / planeAspect);
                                texture.offset.set(0, (1 - (imageAspect / planeAspect)) / 2);
                            }
                            mesh.material.needsUpdate = true;
                            mesh.userData.isLoading = false;
                        },
                        undefined, // onProgress
                        (error) => { // onError
                            console.warn(`Could not load image ${imageUrl} for display:`, error);
                            mesh.material.color.set(0x701c1c); // Darker red for error indication
                            mesh.material.opacity = 0.5;
                            mesh.material.needsUpdate = true;
                            mesh.userData.isLoading = false;
                            mesh.userData.loadError = true;
                        }
                    );
                    
                    // Update currentX for the next photo in the row
                    if (c < photosInThisRowData.length - 1) {
                         // Move from center of current slot to center of next slot
                        currentX += FIXED_SLOT_WIDTH * PHOTO_ASPECT_RATIO_SPACING_FACTOR;
                    }
                }
                currentYForRowBlock -= (PHOTO_BASE_HEIGHT * PHOTO_VERTICAL_SPACING_FACTOR);
            }
            
            // Vertically center the entire layer group
            if (layerGroup.children.length > 0) {
                // The Y positions were set from 0 downwards.
                // currentYForRowBlock is now the Y for the *next* (non-existent) row.
                // The Y of the last row was currentYForRowBlock + (PHOTO_BASE_HEIGHT * PHOTO_VERTICAL_SPACING_FACTOR)
                // The total height of the content block:
                const numActualRows = Math.ceil(photosPlacedInThisLayer / PHOTOS_PER_ROW_TARGET);
                if (numActualRows > 0) {
                    const contentHeight = (numActualRows -1) * (PHOTO_BASE_HEIGHT * PHOTO_VERTICAL_SPACING_FACTOR) + PHOTO_BASE_HEIGHT;
                    // The top of content is at PHOTO_BASE_HEIGHT/2 (from Y=0 row)
                    // The bottom of content is at -(numActualRows-1)*PHOTO_BASE_HEIGHT*PHOTO_VERTICAL_SPACING_FACTOR - PHOTO_BASE_HEIGHT/2
                    // Center Y of the content block relative to layerGroup's origin:
                    const contentCenterY = ( (PHOTO_BASE_HEIGHT/2) + ( -(numActualRows-1)*(PHOTO_BASE_HEIGHT*PHOTO_VERTICAL_SPACING_FACTOR) - PHOTO_BASE_HEIGHT/2 ) ) / 2;
                    layerGroup.position.y = -contentCenterY;

                    // Alternative using Box3, more robust if row photo counts vary wildly (not the case here though)
                    // const box = new THREE.Box3().setFromObject(layerGroup);
                    // const center = new THREE.Vector3();
                    // if (!box.isEmpty()) {
                    //     box.getCenter(center);
                    //     layerGroup.position.y = -center.y; // This center.y is relative to layerGroup's current origin (0,0,0)
                    // }
                }
            }

            layers.push({ z: currentLayerZ, group: layerGroup, photosInLayer: photosPlacedInThisLayer });
            photoIndex += photosPlacedInThisLayer;
            currentLayerZ -= LAYER_DEPTH_SPACING;
        }
    }


    function resolveImageUrl(path) {
        if (!path) return ''; 
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
        if (renderer && scene && camera) renderer.render(scene, camera);
    }

    function updateLayerVisibility() {
        if (!layers.length || !camera) return;
        layers.forEach(layer => {
            if (layer.group) {
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
        if (container) {
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
        if (!controlsEnabled || layers.length === 0 || !camera || !renderer) return;
        event.preventDefault();

        const delta = event.deltaY * (event.deltaMode === 1 ? 33 : 1); // Normalize wheel delta
        const focusedLayerZ = layers[currentFocusedLayerIndex].z;
        
        const oldDistToLayerPlane = currentCameraZ - focusedLayerZ;
        let newTargetRelativeDist = oldDistToLayerPlane + (delta * MOUSE_WHEEL_SENSITIVITY_LAYER_ZOOM);

        const minZoomDist = CAMERA_DEFAULT_VIEW_Z_OFFSET * (1 - CAMERA_ZOOM_RANGE_FACTOR);
        const maxZoomDist = CAMERA_DEFAULT_VIEW_Z_OFFSET * (1 + CAMERA_ZOOM_RANGE_FACTOR);
        newTargetRelativeDist = THREE.MathUtils.clamp(newTargetRelativeDist, minZoomDist, maxZoomDist);
        
        const newTargetCameraZ = focusedLayerZ + newTargetRelativeDist;

        // Pan camera based on mouse position to zoom towards cursor
        mouseNDC.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouseNDC.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
        
        invisibleLayerPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0,0,focusedLayerZ));
        raycaster.setFromCamera(mouseNDC, camera);
        
        if (raycaster.ray.intersectPlane(invisibleLayerPlane, intersectionPoint)) {
            const worldMouseX = intersectionPoint.x;
            const worldMouseY = intersectionPoint.y;

            // Calculate how much the camera needs to shift to keep the intersectionPoint under the mouse
            targetCameraX = worldMouseX - ( (worldMouseX - currentCameraX) / oldDistToLayerPlane ) * newTargetRelativeDist;
            targetCameraY = worldMouseY - ( (worldMouseY - currentCameraY) / oldDistToLayerPlane ) * newTargetRelativeDist;
            targetLookAtX = targetCameraX; // Keep camera looking parallel to Z-axis relative to its new X,Y
            targetLookAtY = targetCameraY;
        } else { // Fallback if ray doesn't intersect (e.g., looking away)
            targetCameraX = currentCameraX * (newTargetRelativeDist / oldDistToLayerPlane);
            targetCameraY = currentCameraY * (newTargetRelativeDist / oldDistToLayerPlane);
            targetLookAtX = targetCameraX;
            targetLookAtY = targetCameraY;
        }
        targetCameraZ = newTargetCameraZ;
        targetLookAtZ = focusedLayerZ; // Always look at the plane of the focused layer
    }

    function onClick(event) {
        if (!controlsEnabled || !camera || !renderer) return;
        event.preventDefault();

        mouseNDC.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouseNDC.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        // Only consider meshes that are loaded (not placeholders or errors) and visible
        const clickablePhotoMeshes = photoMeshes.filter(m => 
            m.parent && m.parent.visible && m.visible && 
            m.userData && !m.userData.isLoading && !m.userData.loadError
        );
        const intersects = raycaster.intersectObjects(clickablePhotoMeshes);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            showModal(clickedObject.userData);
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null; // Invalid date
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
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function hideModal() {
        if (!modalElement) return;
        modalElement.classList.remove('show');
        controlsEnabled = true;
        document.body.style.overflow = ''; // Restore scrolling
    }

    // Initialize dynamic backgrounds if the function exists (from background-switcher.js)
    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }
    
    // Only initialize 3D if albumPath is valid
    if (albumPath) {
        init3D();
    }
});
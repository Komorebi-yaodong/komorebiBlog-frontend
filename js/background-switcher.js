// js/background-switcher.js

const BACKGROUND_CHANGE_INTERVAL_MS = 30000; // 每30秒切换一次背景
let dynamicBackgroundImages = [];
let currentDynamicBgIndex = 0;
let bgLayer1, bgLayer2;
let activeBgLayer, inactiveBgLayer;
let backgroundChangeIntervalId = null;
let repoUrlForBackground; // 将在初始化时传入

async function fetchBackgroundConfig() {
    if (!repoUrlForBackground) {
        console.error("repoUrlForBackground not set for background switcher.");
        return null;
    }
    try {
        const response = await fetch(`${repoUrlForBackground}/background.json`, { cache: "no-cache" });
        if (!response.ok) {
            console.warn(`Failed to fetch background.json (${response.status}). Using default background if any.`);
            return null;
        }
        const imagePaths = await response.json();
        if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
            console.warn('background.json is empty or not an array. Using default background if any.');
            return null;
        }
        return imagePaths.map(path => {
            if (typeof path === 'string' && !path.startsWith('http://') && !path.startsWith('https://')) {
                return `${repoUrlForBackground}/${path.replace(/^\.?\//, '')}`;
            }
            return path;
        }).filter(path => typeof path === 'string' && path.trim() !== '');
    } catch (error) {
        console.error("Error fetching or processing background.json:", error);
        return null;
    }
}

function switchDynamicBackground(imageUrl) {
    if (!bgLayer1 || !bgLayer2 || !imageUrl) return;

    // Preload the image to ensure smooth transition
    const img = new Image();
    img.onload = () => {
        inactiveBgLayer.style.backgroundImage = `url('${imageUrl}')`;
        activeBgLayer.classList.remove('active');
        inactiveBgLayer.classList.add('active');

        [activeBgLayer, inactiveBgLayer] = [inactiveBgLayer, activeBgLayer];
    };
    img.onerror = () => {
        console.warn(`Failed to load background image: ${imageUrl}`);
        // Optionally, try next image or stop rotation for this image
    };
    img.src = imageUrl;
}

async function initializeDynamicBackgrounds(repoUrl) {
    repoUrlForBackground = repoUrl; // Set the repo URL
    bgLayer1 = document.getElementById('bg-layer-1');
    bgLayer2 = document.getElementById('bg-layer-2');

    if (!bgLayer1 || !bgLayer2) {
        console.error("Background layer elements not found. Dynamic background disabled.");
        return;
    }

    activeBgLayer = bgLayer1;
    inactiveBgLayer = bgLayer2;

    const fetchedImages = await fetchBackgroundConfig();

    if (fetchedImages && fetchedImages.length > 0) {
        dynamicBackgroundImages = fetchedImages;
        // Start with a random image
        currentDynamicBgIndex = Math.floor(Math.random() * dynamicBackgroundImages.length); 
        
        // Set initial background without waiting for interval
        switchDynamicBackground(dynamicBackgroundImages[currentDynamicBgIndex]);

        if (dynamicBackgroundImages.length > 1) {
            if (backgroundChangeIntervalId) clearInterval(backgroundChangeIntervalId);
            backgroundChangeIntervalId = setInterval(() => {
                currentDynamicBgIndex = (currentDynamicBgIndex + 1) % dynamicBackgroundImages.length;
                switchDynamicBackground(dynamicBackgroundImages[currentDynamicBgIndex]);
            }, BACKGROUND_CHANGE_INTERVAL_MS);
        }
    } else {
        console.log("No dynamic backgrounds loaded from background.json. Check CSS for default.");

    }
}

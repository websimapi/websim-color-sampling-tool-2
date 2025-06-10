import colorConvert from 'color-convert';

const imageUpload = document.getElementById('imageUpload');
const imageCanvas = document.getElementById('imageCanvas');
const ctx = imageCanvas.getContext('2d');
const eyedropperToggle = document.getElementById('eyedropperToggle');
const eyedropperStatus = document.getElementById('eyedropperStatus');
const paletteDiv = document.getElementById('palette');
const containerDiv = document.querySelector('.container');

let isEyedropperActive = false;
let palette = [];
const STORAGE_KEY = 'colorPalette';

// Load palette from local storage
function loadPalette() {
    const storedPalette = localStorage.getItem(STORAGE_KEY);
    if (storedPalette) {
        palette = JSON.parse(storedPalette);
    }
    renderPalette();
}

// Save palette to local storage
function savePalette() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
    renderPalette();
}

// Render the palette on the page
function renderPalette() {
    if (palette.length === 0) {
        paletteDiv.innerHTML = '<p>No colors sampled yet.</p>';
        return;
    }

    paletteDiv.innerHTML = ''; // Clear current palette

    palette.forEach((color, index) => {
        const entry = document.createElement('div');
        entry.classList.add('color-entry');

        const colorBlock = document.createElement('div');
        colorBlock.classList.add('color-block');
        colorBlock.style.backgroundColor = color.hex;

        const colorValues = document.createElement('div');
        colorValues.classList.add('color-values');

        const rgbLine = document.createElement('div');
        rgbLine.classList.add('value-line');
        rgbLine.innerHTML = `<span>RGB:</span> <code>${color.rgb}</code> <button class="copy-button" data-value="${color.rgb}">Copy</button>`;

        const hslLine = document.createElement('div');
        hslLine.classList.add('value-line');
        hslLine.innerHTML = `<span>HSL:</span> <code>${color.hsl}</code> <button class="copy-button" data-value="${color.hsl}">Copy</button>`;

        const hexLine = document.createElement('div');
        hexLine.classList.add('value-line');
        hexLine.innerHTML = `<span>Hex:</span> <code>${color.hex}</code> <button class="copy-button" data-value="${color.hex}">Copy</button>`;

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeColor(index));

        colorValues.appendChild(rgbLine);
        colorValues.appendChild(hslLine);
        colorValues.appendChild(hexLine);

        entry.appendChild(colorBlock);
        entry.appendChild(colorValues);
        entry.appendChild(removeButton);

        paletteDiv.appendChild(entry);
    });

    // Add event listeners to copy buttons
    paletteDiv.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            navigator.clipboard.writeText(button.dataset.value)
                .then(() => {
                    // Optional: Provide feedback to user (e.g., change button text temporarily)
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1000);
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                });
        });
    });
}

// Add color to palette
function addColor(rgbArray) {
    if (!rgbArray || rgbArray.length < 3) return;

    const rgb = `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`;
    const hsl = `hsl(${Math.round(colorConvert.rgb.hsl(rgbArray)[0])}, ${Math.round(colorConvert.rgb.hsl(rgbArray)[1])}%, ${Math.round(colorConvert.rgb.hsl(rgbArray)[2])}%)`;
    const hex = `#${colorConvert.rgb.hex(rgbArray).toLowerCase()}`;

    const newColor = { rgb, hsl, hex };

    // Prevent adding duplicate colors based on hex value
    if (!palette.some(color => color.hex === newColor.hex)) {
        palette.push(newColor);
        savePalette();
    }
}

// Remove color from palette
function removeColor(index) {
    palette.splice(index, 1);
    savePalette();
}


// Load image from file input
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        loadImage(URL.createObjectURL(file));
    }
});

// Load image from paste event
document.addEventListener('paste', (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            loadImage(URL.createObjectURL(blob));
            event.preventDefault(); // Prevent default paste behavior
            break;
        }
    }
});

// Load image onto canvas
function loadImage(src) {
    const img = new Image();
    img.onload = () => {
        // Calculate aspect ratio to fit within container while maintaining ratio
        const containerWidth = containerDiv.offsetWidth - 60; // Adjust for padding
        const containerHeight = window.innerHeight * 0.6; // Max 60% of viewport height

        let width = img.width;
        let height = img.height;

        if (width > containerWidth) {
            height = height * (containerWidth / width);
            width = containerWidth;
        }
        if (height > containerHeight) {
             width = width * (containerHeight / height);
             height = containerHeight;
        }


        imageCanvas.width = width;
        imageCanvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Revoke object URL after image is loaded
        URL.revokeObjectURL(src);
    };
    img.onerror = () => {
        console.error('Error loading image.');
        // Revoke object URL even if there's an error
        URL.revokeObjectURL(src);
    };
    img.src = src;
}

// Toggle eyedropper state
eyedropperToggle.addEventListener('click', () => {
    isEyedropperActive = !isEyedropperActive;
    eyedropperStatus.textContent = isEyedropperActive ? 'Active' : 'Inactive';
    eyedropperToggle.textContent = isEyedropperActive ? 'Deactivate Eyedropper' : 'Activate Eyedropper';
    imageCanvas.classList.toggle('eyedropper-active', isEyedropperActive);
});

// Sample color on canvas click
imageCanvas.addEventListener('click', (event) => {
    if (!isEyedropperActive) {
        return;
    }

    // Get mouse position relative to the canvas
    const rect = imageCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Get pixel data
    try {
        const pixel = ctx.getImageData(x, y, 1, 1).data; // RGBA array
        // pixel[0] = R, pixel[1] = G, pixel[2] = B, pixel[3] = A

        // We only care about RGB for the color conversions
        const rgbArray = [pixel[0], pixel[1], pixel[2]];

        addColor(rgbArray);

    } catch (e) {
        console.error("Could not get pixel data. This might be due to CORS restrictions on the image.", e);
        alert("Cannot sample color from this image. This might be due to security restrictions (CORS). Try uploading a local image or pasting a local image.");
    }
});

// Initial load of palette
loadPalette();


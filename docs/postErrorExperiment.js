// postErrorExperiment.js

// =======
// Initializations
// =======

const startBtn = document.getElementById("start-btn");
const boxContainer = document.getElementById("box-container");
const feedbackBox = document.getElementById("feedback-box");
let spacePress = false;

const canvas = document.getElementById("stimuli-canvas");
const ctx = canvas.getContext("2d");
canvas.width = boxContainer.clientWidth;
canvas.height = boxContainer.clientHeight;

let maskCanvas = document.getElementById("foveation-mask");
const maskCtx = maskCanvas.getContext("2d");
maskCanvas.width = `${boxContainer.offsetWidth}px`;
maskCanvas.height = `${boxContainer.offsetHeight}px`;

// ==============================
// Feedback and Event Listeners
// ==============================

startBtn.addEventListener("click", startTask);
boxContainer.addEventListener("mousemove", updateCursorPosition);
window.addEventListener("keydown", handleSpacebarPress);

function handleClick(isCorrect) {
    showFeedback(isCorrect);
    endTrial();
}

function handleSpacebarPress(event) {
    if (event.code === "Space" && !spacePress) { // Check if spacebar was pressed
        spacePress = true;
        const isCorrect = !isTargetPresent;
        showFeedback(isCorrect);
        endTrial(false); // false indicates no T found}
    }
}

function showFeedback(isCorrect) {
    feedbackBox.style.display = "block";
    if (isCorrect) {
        feedbackBox.textContent = "Correct!";
        feedbackBox.style.color = "green";
    } else {
        feedbackBox.textContent = "Incorrect!";
        feedbackBox.style.color = "red";
    }
}

// ======================
// Start and End Trials
// ======================

function startTask() {
    console.log("Starting task...");

    // Ensure boxContainer exists
    if (!boxContainer) {
        console.error("Box container not found!");
        return;
    }

    // Hide start button
    startBtn.style.display = "none";

    // Clear any previous trial display
    clearDisplay();

    // Ensure the foveation mask exists or create it dynamically
    let maskCanvas = document.getElementById("foveation-mask");
    if (!maskCanvas) {
        console.log("Creating foveation mask...");
        maskCanvas = document.createElement("canvas");
        maskCanvas.id = "foveation-mask";
        boxContainer.appendChild(maskCanvas);
    }

    // Set mask dimensions
    maskCanvas.width = boxContainer.offsetWidth;
    maskCanvas.height = boxContainer.offsetHeight;

    // Log canvas dimensions for debugging
    console.log("Mask canvas dimensions:", maskCanvas.width, maskCanvas.height);

    // Initialize the foveation mask position
    drawFoveationMask(cursorX, cursorY);

    // Determine if this trial is target-present or absent
    isTargetPresent = Math.random() < 0.5; // 50% chance of target-present
    targetPosition = isTargetPresent ? Math.floor(Math.random() * numItems) : -1;

    // Render stimuli
    renderStimuli(targetPosition, isTargetPresent);
}

function clearDisplay() {
    // Clear feedback 
    feedbackBox.style.display = "none";
    feedbackBox.textContent = "";

    // Remove only dynamic stimuli elements, not the entire container content
    const dynamicElements = boxContainer.querySelectorAll(".dynamic");
    dynamicElements.forEach(el => el.remove());

    // Remove the existing foveation mask before drawing a new one
    const existingMask = document.getElementById("foveation-mask-canvas");
    if (existingMask) {
        existingMask.remove();
    }

    // Ensure the foveation mask is created and added to DOM before drawing
    // const foveationMask = document.createElement("canvas");
    // foveationMask.id = "foveation-mask";
    // document.body.appendChild(foveationMask);  // Or append to a specific container

    // Clear the cursor canvas but ensure the cursor ring continues to update
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function endTrial() {
    spacePress = false;
    setTimeout(startTask, 1000);
}

// ============================
// Create and Present Stimuli
// ============================

let isTargetPresent;
let targetPosition;
let numItems;

function generateRandomPosition(positions, itemSize, minDistance) {
    let randomX, randomY, isOverlapping;

    do {
        isOverlapping = false;
        randomX = Math.random() * (boxContainer.clientWidth - itemSize);
        randomY = Math.random() * (boxContainer.clientHeight - itemSize);

        for (const pos of positions) {
            const distance = Math.sqrt(
                Math.pow(randomX - pos.x, 2) + Math.pow(randomY - pos.y, 2)
            );
            if (distance < minDistance) {
                isOverlapping = true;
                break;
            }
        }
    } while (isOverlapping);

    return { x: randomX, y: randomY };
}

function createStimulus(x, y, itemSize, isTarget) {
    const item = document.createElement("div");
    item.classList.add("stimulus", "dynamic");

    // Assign position and size
    item.style.position = "absolute";
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.width = `${itemSize}px`;
    item.style.height = `${itemSize}px`;

    // Assign content and rotation
    item.textContent = isTarget ? "T" : "L";
    const randomRotation = Math.floor(Math.random() * 4) * 90;
    item.style.transform = `rotate(${randomRotation}deg)`;

    item.style.pointerEvents = "auto";

    return item;
}

function renderStimuli(targetPosition, isTargetPresent) {
    const possibleItemCounts = [1, 2, 4, 8, 16];
    numItems = possibleItemCounts[Math.floor(Math.random() * possibleItemCounts.length)];
    targetPosition = Math.floor(Math.random() * numItems); // Determine target position
    const itemSize = 60;
    const minDistance = itemSize + 10;
    const positions = [];
 
    // Produce items
    for (let i = 0; i < numItems; i++) {
        const isTarget = i === targetPosition && isTargetPresent;
        const { x, y } = generateRandomPosition(positions, itemSize, minDistance);

        positions.push({ x,y });

        const item = createStimulus(x, y, itemSize, isTarget);
        boxContainer.appendChild(item);

        item.addEventListener("click", () => handleClick(isTarget));
    }

    drawFoveationMask(cursorX, cursorY);
    // cursorRing(cursorX, cursorY);
}    

// ================
// Mouse-Tracking
// ================

let cursorX = 0;
let cursorY = 0;

function updateCursorPosition(event) {
    const rect = boxContainer.getBoundingClientRect();
    cursorX = event.clientX - rect.left; // X coordinate relative to boxContainer
    cursorY = event.clientY - rect.top;  // Y coordinate relative to boxContainer

    // Clear the canvas to remove the previous ring
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawFoveationMask(cursorX, cursorY);
    // cursorRing(cursorX, cursorY);
}

// cursorRing is just a check that position is being tracked
function cursorRing(cursorX, cursorY) {
    let cursorRadius = 25;
    ctx.beginPath(); 
    ctx.arc(cursorX, cursorY, cursorRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// =================
// Foveation Mask
// =================
document.addEventListener('DOMContentLoaded', function() {
    drawFoveationMask(cursorX, cursorY);
});

function drawFoveationMask(cursorX, cursorY) {
    // Check if the mask actually exists before drawing
    // if (!maskCanvas) {
        // console.error("Foveation mask element not found in the DOM");
        // return;
    // }

    // Ensure the mask has a valid context or properties for further drawing
   // if (!maskCtx) {
        // console.error("Failed to get context for the foveation mask.");
        // return;
    // }
    
    maskCtx.clearRect(0, 0, boxContainer.offsetWidth, boxContainer.offsetHeight); // Clear previous mask

    // Set the color and opacity for the mask
    maskCtx.fillStyle = "#b7b7b7";  // Light gray color for the mask
    maskCtx.globalAlpha = 0.9725;  // Set opacity
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);  // Fill the entire canvas with mask color

    eraseFoveation(cursorX, cursorY, maskCtx);

    maskCtx.restore();
}

function eraseFoveation(cursorX, cursorY, maskCtx) {
    maskCtx.save();
    maskCtx.globalCompositeOperation = "destination-out";
    maskCtx.beginPath();
    maskCtx.arc(cursorX, cursorY, 30, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();
}
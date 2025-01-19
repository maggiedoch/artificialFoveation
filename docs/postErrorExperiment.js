// postErrorExperiment.js

// =========================
// Global Initializations
// =========================

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

let clickedLocations = [];
let clickedStimulus = null;
let mouseTrajectory = [];
let currentTrial = {};
let trialCounter = 0;
let logCounter = 0;
let trialCorrect = false;
let previousTrialCorrect = null;
let trialStartTime = [];
let stimulusCoordinates = [];

// ===============
// Data Logging
// ===============

function generateTrialID() {
    trialCounter ++;
    return `trial${trialCounter}`;
}

function logTrialData() {
    const trialID = currentTrial.trialID;
    const trialType = currentTrial.trialType;
    const setSize = currentTrial.setSize;
    const totalSearchTime = trialEndTime - trialStartTime;
    const hitCount = currentTrial.stimuli.filter(
        stim => stim.clickCount > 0 && stim.targetCond === 1).length;
    const faCount = currentTrial.stimuli.filter(
        stim => stim.clickCount > 0 && stim.targetCond !== 1).length;
    const missCount = currentTrial.stimuli.filter(
        stim => stim.clickCount === 0 && stim.targetCond === 1).length;
    
    const allClicks = clickedLocations.map((click, index) => {
        return {
            x: click.x,
            y: click.y,
            correct: click.correct,
            time: click.time,
            clickCount: click.clickCount,
            stimIndex: click.stimIndex,
            targetCond: click.targetCond,
            rotation: click.rotation
        };
    });

    const stimuliJSON = JSON.stringify(currentTrial.stimuli);
    const allClicksJSON = JSON.stringify(allClicks);
    const mouseTrajectoryJSON = JSON.stringify(mouseTrajectory || []);

    const trialData = {
        logCounter,
        trialID,
        trialType,
        setSize,
        totalSearchTime,
        hitCount,
        faCount,
        missCount,
        trialCorrect,
        previousTrialCorrect,
        stimuli: stimuliJSON,
        allClicks: allClicksJSON,
        mouseTrajectory: mouseTrajectoryJSON
    };

    console.log("Trial Data:", trialData);
    return trialData;
}

// ==============================
// Feedback and Event Listeners
// ==============================

startBtn.addEventListener("click", startTask);
boxContainer.addEventListener("mousemove", updateCursorPosition);
window.addEventListener("keydown", handleSpacebarPress);

function handleClick(_, event) {
    console.log("Current trial at handleClick:", currentTrial);

    const rect = boxContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    console.log("Click coordinates:", 
        { clickX, clickY });

    if (!currentTrial.stimuli || currentTrial.stimuli.length === 0) {
        console.error("Stimuli array is not initialized or empty");
        return;
    }

    const tolerance = 30;

    const stimIndex = currentTrial.stimuli.findIndex((stim, index) => {
        const halfSize = stim.itemSize / 2;
        const stimLeft = stim.x - halfSize;
        const stimRight = stim.x + halfSize;
        const stimTop = stim.y - halfSize;
        const stimBottom = stim.y + halfSize;
        const inBounds = (
            clickX >= stimLeft - tolerance && clickX <= stimRight + tolerance && 
            clickY >= stimTop - tolerance && clickY <= stimBottom + tolerance);
        console.log(`Stimulus ${index} bounds vs. click:`, {
            stimLeft,
            stimRight,
            stimTop,
            stimBottom,
            clickX,
            clickY,
            inBounds
        });
        return inBounds;
    });

    if (stimIndex === -1) {
        console.log("Click did not match any stimulus!", { clickX, clickY });
        trialCorrect = false;
        showFeedback(false); // Clicked on empty space
        endTrial();
        return;
    }

    const clickedStimulus = currentTrial.stimuli[stimIndex];
    if (!clickedStimulus) {
        console.error("clickedStimulus is null or undefined!");
        trialCorrect = false;
        showFeedback(false);
        endTrial();
        return;
    }

    console.log("Clicked stimulus found, stimulus #", stimIndex, ":", 
        clickedStimulus);
    trialCorrect = clickedStimulus.isTarget;
    console.log("Trial correct based on click:", trialCorrect);
    showFeedback(trialCorrect);
    endTrial();
}

function handleSpacebarPress(event) {
    if (event.code === "Space" && !spacePress) {
        spacePress = true;

        if (!isTargetPresent) {
            trialCorrect = true;
        } else {
            trialCorrect = false;
        }

        console.log("Spacebar pressed. isTargetPresent:", isTargetPresent,
            "trialCorrect:", trialCorrect);
        showFeedback(trialCorrect);
        endTrial();
    }
}

function showFeedback(isCorrect) {
    feedbackBox.style.display = "block";
    if (isCorrect === true) {
        feedbackBox.textContent = "Correct!";
        feedbackBox.style.color = "green";
    } else if (isCorrect === false) {
        feedbackBox.textContent = "Incorrect!";
        feedbackBox.style.color = "red";
    }
    console.log("Feedback displayed:", isCorrect ? "Correct" : "Incorrect");
}

// ======================
// Start and End Trials
// ======================

function startTask() {
    clickedLocations = [];
    mouseTrajectory = [];
    trialStartTime = Date.now();
    console.log("Trial start time:", trialStartTime);
    currentTrial = {
        trialID: generateTrialID(),
        trialType: Math.random() < 0.5 ? "targetPresent" : "targetAbsent",
        stimuli: [],
    };
    console.log("Trial type for trial #", logCounter, ":", 
        currentTrial.trialType);
    startBtn.style.display = "none";
    clearDisplay();

    // Ensure the foveation mask exists or create it dynamically
    let maskCanvas = document.getElementById("foveation-mask");
    if (!maskCanvas) {
        maskCanvas = document.createElement("canvas");
        maskCanvas.id = "foveation-mask";
        boxContainer.appendChild(maskCanvas);
    }

    // Set mask dimensions
    maskCanvas.width = boxContainer.offsetWidth;
    maskCanvas.height = boxContainer.offsetHeight;

    // Log container dimensions for debugging
    console.log("boxContainer dimensions:", {
        width: boxContainer.clientWidth,
        height: boxContainer.clientHeight,
        offsetLeft: boxContainer.offsetLeft,
        offsetTop: boxContainer.offsetTop
    });

    // Initialize the foveation mask position
    drawFoveationMask(cursorX, cursorY);

    isTargetPresent = currentTrial.trialType === "targetPresent";
    const targetPosition = isTargetPresent ? Math.floor(
        Math.random() * numItems) : -1;
    console.log("Target Position:", targetPosition);
    // Render stimuli and save details to currentTrial
    currentTrial.stimuli = renderStimuli(targetPosition, isTargetPresent);

    // Update setSize based on the number of stimuli
    currentTrial.setSize = currentTrial.stimuli.length;
}

function clearDisplay() {
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
    stimulusCoordinates = [];

    // Clear the cursor canvas but ensure the cursor ring continues to update
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function endTrial() {
    trialEndTime = Date.now();
    logCounter++;
    const trialData = logTrialData();
    spacePress = false;
    previousTrialCorrect = trialCorrect;
    logTrialData();
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
    stimulusCoordinates.push({ x, y, itemSize });

    // Assign content and rotation
    item.textContent = isTarget ? "T" : "L";
    const randomRotation = Math.floor(Math.random() * 4) * 90;
    item.style.transform = `rotate(${randomRotation}deg)`;
    return item;
}

function renderStimuli(targetPosition, isTargetPresent) {
    if (!currentTrial) {
        console.error("currentTrial is not initialized");
        return;
    }
    
    const possibleItemCounts = [1, 2, 4, 8, 12];
    numItems = possibleItemCounts[Math.floor(Math.random() * 
        possibleItemCounts.length)];
    targetPosition = Math.floor(Math.random() * numItems); 
    console.log("Target Position at start of trial:", targetPosition);
    const itemSize = 60; 
    const minDistance = itemSize + 10;
    const positions = [];
    currentTrial.stimuli = [];
 
    for (let stimIndex = 0; stimIndex < numItems; stimIndex++) {
        const isTarget = stimIndex === targetPosition && isTargetPresent;
        const { x, y } = generateRandomPosition(positions, itemSize, 
            minDistance);
        positions.push({ x,y });

        const item = createStimulus(x, y, itemSize, isTarget);
        boxContainer.appendChild(item);

        currentTrial.stimuli.push({
            x,
            y,
            itemSize,
            isTarget,
            clickCount: 0,
        });

        console.log(`Stimulus ${stimIndex} added:`, {
            index: stimIndex,
            x,
            y,
            isTarget,
            targetPosition,
            isTargetPresent,
        });
        item.addEventListener("click", (event) => handleClick(
            isTarget, event));
    }

    console.log("Current trial stimuli after generation:", 
        currentTrial.stimuli);
        console.log("Target Position in currentTrial.stimuli:", 
            currentTrial.stimuli.findIndex(stim => stim.isTarget));
    drawFoveationMask(cursorX, cursorY);
    // cursorRing(cursorX, cursorY);
    return currentTrial.stimuli;
}    

// =================================
// Cursor Ring and Mouse Position
// =================================

let cursorX = 0;
let cursorY = 0;

function updateCursorPosition(event) {
    const rect = boxContainer.getBoundingClientRect();
    cursorX = event.clientX - rect.left; // X coordinate relative to boxContainer
    cursorY = event.clientY - rect.top;  // Y coordinate relative to boxContainer

    mouseTrajectory.push({
        x: cursorX,
        y: cursorY,
        time: Date.now() - trialStartTime,
    });

    // Clear the canvas to remove the previous ring
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFoveationMask(cursorX, cursorY);
    // cursorRing(cursorX, cursorY);
}

function cursorRing(cursorX, cursorY) {
    let cursorRadius = 25;
    ctx.beginPath(); 
    ctx.arc(cursorX, cursorY, cursorRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// =================
// Foveation Mask
// =================
document.addEventListener('DOMContentLoaded', function() {
    drawFoveationMask(cursorX, cursorY);
});

function drawFoveationMask(cursorX, cursorY) {    
    // Global mask layer
    maskCtx.clearRect(0, 0, boxContainer.offsetWidth, 
        boxContainer.offsetHeight); // Clear previous mask
    maskCtx.fillStyle = "#e5e7e9";  // gray: #b7b7b7; light gray: #e5e7e9
    maskCtx.globalAlpha = 1.0;
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);  
    
    // Local mask layer
    maskCtx.fillStyle = "#000000";
    maskCtx.font = "14px Arial";
    maskCtx.textAlign = "center";
    maskCtx.textBaseline = "middle";
    stimulusCoordinates.forEach(({ x, y, itemSize}) => {
        const centerX = x + itemSize / 2;
        const centerY = y + itemSize / 2;
        maskCtx.fillText("*", centerX, centerY);
    });

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

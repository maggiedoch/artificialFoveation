// postErrorExperiment.js

// =========================
// Global Initializations
// =========================

const startBtn = document.getElementById("start-btn");
const boxContainer = document.getElementById("box-container");
const feedbackBox = document.getElementById("feedback-box");
let spacePress = false;

// For stimulus array
const canvas = document.getElementById("stimuli-canvas");
const ctx = canvas.getContext("2d");
canvas.width = boxContainer.clientWidth;
canvas.height = boxContainer.clientHeight;

// For foveation mask
let maskCanvas = document.getElementById("foveation-mask");
const maskCtx = maskCanvas.getContext("2d");
maskCanvas.width = `${boxContainer.offsetWidth}px`;
maskCanvas.height = `${boxContainer.offsetHeight}px`;

// For data logging
let clickedLocations = [];
let clickedStimulus = null;
let mouseTrajectory = [];
let currentTrial = {};
let trialCounter = 0;
let logCounter = 0;
let trialCorrect = false;
let previousTrialCorrect = null;
let previousTrialSize = null;
let experimentStartTime = null;
let trialStartTime = [];
let stimulusCoordinates = [];

// Used to prevent extraneous clicks or presses
let trialActive = null;

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
        stim => stim.clickCount > 0 && stim.isTarget).length;
    const faCount = currentTrial.stimuli.filter(
        stim => stim.clickCount > 0 && !stim.isTarget).length;
    const missCount = currentTrial.stimuli.filter(
        stim => stim.clickCount === 0 && stim.isTarget && 
        !trialCorrect).length;
    const correctRejectionCount = (trialCorrect &&
        currentTrial.stimuli.every(stim => stim.clickCount === 0)) ? 1 : 0;
    const allClicks = clickedLocations.map((click, index) => {
        return {
            x: click.x,
            y: click.y,
            correct: click.correct,
            time: click.time,
            clickCount: click.clickCount,
            stimIndex: click.stimIndex,
            targetCond: click.targetCond,
        };
    });

    const stimuliJSON = JSON.stringify(currentTrial.stimuli);
    const allClicksJSON = JSON.stringify(allClicks);
    const mouseTrajectoryJSON = JSON.stringify(mouseTrajectory || []);
    const stimuliDwellTimeJSON = JSON.stringify(stimuliDwellTime);

    const trialData = {
        experimentStartTime,
        logCounter,
        trialID,
        trialType,
        setSize,
        totalSearchTime,
        hitCount,
        faCount,
        correctRejectionCount,
        missCount,
        trialCorrect,
        previousTrialCorrect,
        previousTrialSize,
        stimuli: stimuliJSON,
        allClicks: allClicksJSON,
        mouseTrajectory: mouseTrajectoryJSON,
        stimuliDwellTime: stimuliDwellTimeJSON
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

function handleClick(event) {
    if (!trialActive) = return; // Ignore extraneous clicks
    
    if (!event || typeof event.clientX === "undefined" || 
        typeof event.clientY === "undefined") {
        console.error("handleClick was triggered without a valid event object!");
        return;
    }

    const rect = boxContainer.getBoundingClientRect();
    if (!rect) {
        console.error("Could not retrieve bounding rect for boxContainer");
        return;
    }

    const clickedElement = event.target;
    // console.log("Clicked element:", clickedElement);
    if (!clickedElement.dataset.stimIndex) {
        console.error("Clicked element has no stimIndex dataset attribute!");
        return;
    }

    let stimIndex = parseInt(clickedElement.dataset.stimIndex, 10);
    // console.log("Retrieved stimIndex:", stimIndex);
    // console.log("StimIndex type:", typeof stimIndex, "Value:", stimIndex);

    // Validate stimIndex before using it
    if (isNaN(stimIndex) || stimIndex < 0 || 
    stimIndex >= currentTrial.stimuli.length) {
        console.error("Invalid stimIndex:", stimIndex);
        trialCorrect = false;
        showFeedback(false);
        endTrial();
        return;
    }
    
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    if (isNaN(clickX) || isNaN(clickY)) {
        console.error("Click coordinates could not be determined!",
            { clickX, clickY });
    }
    // console.log("Click coordinates:", { clickX, clickY });


    // Handle case where click doesn't match a stimulus
    if (stimIndex === -1) {
        console.log("Click did not match any stimulus!", { clickX, clickY });
        trialCorrect = false;
        showFeedback(false); // Clicked on empty space
        endTrial();
        return;
    }

    // Retrieve correct stimulus object
    // console.log("Attempting to retreive stimIndex:", stimIndex, 
        // "from stimuli array:", currentTrial.stimuli);
    const clickedStimulus = currentTrial.stimuli[stimIndex];
    // console.log("Retrieved clickedStimulus:", clickedStimulus);

    if (!clickedStimulus) {
        console.error("clickedStimulus is null or undefined!");
        trialCorrect = false;
        showFeedback(false);
        endTrial();
        return;
    }

    clickedStimulus.clickCount += 1;

    clickedLocations.push({
        x: clickX,
        y: clickY,
        correct: clickedStimulus.isTarget,
        time: Date.now(),
        clickCount: clickedStimulus.clickCount, 
        stimIndex,
        targetCond: clickedStimulus.isTarget ? 1 : 0,
    });

    // console.log("isTarget value at click:", 
        // clickedStimulus ? clickedStimulus.isTarget : "No stimulus found");
    
    trialCorrect = clickedStimulus.isTarget;
    // console.log("Trial correct based on click:", trialCorrect);

    showFeedback(trialCorrect);
    endTrial();
}

function handleSpacebarPress(event) {
    if (!trialActive || event.code !== "Space") return; // Ignore if trial is inactive or key is not Space
    
    if (event.code === "Space" && !spacePress) {
        spacePress = true;

        if (!isTargetPresent) {
            trialCorrect = true;
        } else {
            trialCorrect = false;
        }

        // console.log("Spacebar pressed. isTargetPresent:", isTargetPresent,
            // "trialCorrect:", trialCorrect);
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
    // console.log("Feedback displayed:", isCorrect ? "Correct" : "Incorrect");
}

// ======================
// Start and End Trials
// ======================

function startTask() {
    trialActive = true; // Accept clicks or presses
    clickedLocations = [];
    mouseTrajectory = [];
    
    // Check previousTrialCentered and remove fixation cross
    checkCursorCentered();
    let existingFixation = document.getElementById("fixationCross");
    if (existingFixation) {
        existingFixation.remove();
    
    if (experimentStartTime === null) {
        experimentStartTime = Date.now();
        console.log("Experiment start time:", experimentStartTime);
    }
    trialStartTime = Date.now();
    console.log("Trial #", logCounter, "start time:", trialStartTime);
    currentTrial = {
        trialID: generateTrialID(),
        trialType: Math.random() < 0.5 ? "targetPresent" : "targetAbsent",
        stimuli: [],
    };
    currentTrial.stimuli.forEach(stim => stim.clickCount = 0);
    // console.log("Trial type for trial #", logCounter, ":", 
        // currentTrial.trialType);
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
    // console.log("boxContainer dimensions:", {
        // width: boxContainer.clientWidth,
        // height: boxContainer.clientHeight,
        // offsetLeft: boxContainer.offsetLeft,
        // offsetTop: boxContainer.offsetTop
    // });

    // Initialize the foveation mask position
    drawFoveationMask(cursorX, cursorY);

    isTargetPresent = currentTrial.trialType === "targetPresent";
    const targetPosition = isTargetPresent ? Math.floor(
        Math.random() * numItems) : -1;
    // console.log("Target Position:", targetPosition);
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

    // Ensure last dwell time is logged before ending trial
    if (lastHoveredStimIndex !== null & entryTime !== null) {
        exitTime = Date.now();
        dwellDuration = exitTime - entryTime;

        if (dwellDuration >= 0) {
            stimuliDwellTime.push({
                stimIndex: lastHoveredStimIndex,
                entryTime: entryTime,
                exitTime: exitTime,
                totalDwellTime: dwellDuration,
            });
            console.log(`Final dwell time logged for stimulus 
                ${lastHoveredStimIndex}: ${dwellDuration} ms`);
        }
    }
    // Reset dwell time tracking variables
    lastHoveredStimIndex = null;
    entryTime = null;

    logCounter++;
    const trialData = logTrialData();
    spacePress = false;
    previousTrialCorrect = trialCorrect;
    previousTrialSize = currentTrial.setSize;
    trialActive = false;
    drawCenterFixation();
    setTimeout(startTask, 1500);
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
    
    const possibleItemCounts = [4, 16, 36];
    numItems = possibleItemCounts[Math.floor(Math.random() * 
        possibleItemCounts.length)];
    if (isTargetPresent) {
        targetPosition = Math.floor(Math.random() * numItems);
    }  else {
        targetPosition = -1;}
    // console.log("Target Position at start of trial:", targetPosition);
    
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
            stimIndex,
            x,
            y,
            itemSize,
            isTarget,
            clickCount: 0,
        });

        // console.log(`Stimulus ${stimIndex} setup:`, {
            // index: stimIndex,
            // assignedAsTarget: isTarget,
            // targetPosition,
            // isTargetPresent
        // });

        item.dataset.stimIndex = stimIndex; // Store index in HTML element
        item.addEventListener("click", handleClick);
    }

    // console.log("Final stimuli list after renderStimuli():",
        // JSON.stringify(currentTrial.stimuli, null, 2));
    drawFoveationMask(cursorX, cursorY);
    // cursorRing(cursorX, cursorY);
    return currentTrial.stimuli;
}    

// =================================
// Cursor Ring and Mouse Position
// =================================

let cursorX = 0;
let cursorY = 0;
let lastHoveredStimIndex = null;
let currentTime = Date.now();
let entryTime = null;
let exitTime = null;
let dwellDuration = null; 
    // Confusing name, but it gets used to calculate stimuliDwellTime
let stimuliDwellTime = [];
const tolerance = 30;

function updateCursorPosition(event) {
    const rect = boxContainer.getBoundingClientRect();
    cursorX = event.clientX - rect.left; // relative to boxContainer
    cursorY = event.clientY - rect.top;  // relative to boxContainer

    mouseTrajectory.push({
        x: cursorX,
        y: cursorY,
        time: Date.now(),
    });

    trackDwellTime(cursorX, cursorY, currentTime);

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

function trackDwellTime(cursorX, cursorY, currentTime) {
    if (!currentTrial.stimuli || currentTrial.stimuli.length === 0) return;

    // Find stimulus within cursor
    const hoveredStimIndex = currentTrial.stimuli.findIndex((stim) => {
        const halfSize = stim.itemSize / 2;
        const stimLeft = stim.x - halfSize;
        const stimRight = stim.x + halfSize;
        const stimTop = stim.y - halfSize;
        const stimBottom = stim.y + halfSize;

        return (
            cursorX >= stimLeft - tolerance &&
            cursorX <= stimRight + tolerance &&
            cursorY >= stimTop - tolerance &&
            cursorY <= stimBottom + tolerance
        );
    });

    // If cursor is outside all stimuli
    if (hoveredStimIndex === -1) {
        if (lastHoveredStimIndex !== null && entryTime !== null) {
            // Log dwell time for the last hovered stimulus
            exitTime = Date.now();
            dwellDuration = exitTime - entryTime;
            
            if (dwellDuration >= 0) {
                stimuliDwellTime.push({
                    stimIndex: lastHoveredStimIndex,
                    entryTime: entryTime,
                    exitTime: exitTime,
                    totalDwellTime: dwellDuration,
                });
                console.log(`Dwell time logged for stimulus ${lastHoveredStimIndex}:
                    ${dwellDuration} ms`);
            } else {
                console.warn(`Skipping negative dwell time for stim 
                    ${lastHoveredStimIndex}`, {
                        entryTime,
                        exitTime,
                        dwellDuration
                    });
            }
        }
        lastHoveredStimIndex = null;
        entryTime = null;
        return;
    }

    // If cursor enters a new stimulus
    if (hoveredStimIndex !== lastHoveredStimIndex) {
        // Log the previous dwell entry before switching stimuli
        if (lastHoveredStimIndex !== null & entryTime !== null) {
            exitTime = Date.now();
            dwellDuration = exitTime - entryTime;

            if (dwellDuration >= 0) { // Ensure no negative dwell times
                stimuliDwellTime.push({
                    stimIndex: lastHoveredStimIndex,
                    entryTime: entryTime,
                    exitTime: exitTime,
                    totalDwellTime: dwellDuration,
            });
            console.log(`Dwell time logged for stimulus ${lastHoveredStimIndex}
                ${dwellDuration} ms`);
        } 
    }
    // Start a new dwell entry
    lastHoveredStimIndex = hoveredStimIndex;
    entryTime = Date.now();
    // console.log(`Started dwell time tracking for stimulus ${hoveredStimIndex}`);
}
}

// =================
// Foveation Mask
// =================

// I honestly don't remember what this one does
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
        maskCtx.fillText("X", centerX, centerY);
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

// ==================
// Foveation Cross
// ==================

let previousTrialCentered = null; // Will use to determine cross color

function drawCenterFixation() {
    const fixation = document.createElement("div");
    fixation.id = "fixationCross";
    
    fixation.style.position = "absolute";
    fixation.style.left = `${canvas.width / 2}px`;
    fixation.style.top = `${canvas.height /2}px`;

    let crossColor = previousTrialCentered === false ? "#ff0016" : "#1b8f33";
        // If previousTrialCentered is false, draw red. Otherwise, green.
    fixation.style.color = crossColor;
    fixation.style.transform = "translate(-50%, -50%)";
    fixation.style.fontSize = "30px";
    fixation.style.fontWeight = "bold";
    fixation.style.zIndex = "3"; // One layer above foveation mask
    fixation.textContent = "+";

    boxContainer.appendChild(fixation);
}

function checkCursorCentered () {
    const fixationSize = 30;
    
    // Define fixation cross bounds
    const fixLeft = canvas.width / 2 - fixationSize / 2 - tolerance;
    const fixRight = canvas.width / 2 + fixationSize / 2 + tolerance;
    const fixTop = canvas.height / 2 - fixationSize / 2 - tolerance;
    const fixBottom = canvas.height / 2 + fixationSize / 2 + tolerance;

    previousTrialCentered =
        cursorX >= fixLeft && cursorX <= fixRight &&
        cursorY >= fixTop && cursorY <= fixBottom;

    console.log(`Previous Trial Centered: ${previousTrialCentered}`);
}

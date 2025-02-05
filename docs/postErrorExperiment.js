// postErrorExperiment.js

// =========================
// Global Initializations
// =========================

const startBtn = document.getElementById("start-btn");
const boxContainer = document.getElementById("box-container");
const feedbackBox = document.getElementById("feedback-box");
let spacePress = false;

const canvas = document.getElementById("canvas");
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
let currentTrial;
let trialCounter = 0;
let logCounter = 0;
let trialCorrect = false;
let previousTrialCorrect = null;
let experimentStartTime = null;
let trialStartTime = [];
let stimulusCoordinates = [];
let trialType;
let setSize;
let targetPosition;
let numItems;
let iBlock = 0;
let iTrial = 0;


// Exp struct variables
const preload = 0;
let expStruct;

// ===============
// Loading Experiment Structure
// ===============
if (preload === 0) {
    expStruct = makeExpStruct();
    //initializeData();
    updateDisplayWithTrialInfo();
} else {
    loadExpStruct(expStructId)
        .then(loadedExpStruct => {
            expStruct = loadedExpStruct;
            // Initialize the data object after expStruct is loaded
            //initializeData();
            updateDisplayWithTrialInfo();
            console.log("condition load success");
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function updateDisplayWithTrialInfo() {
    const totalTrials = expStruct.reduce((total, block) => total + block.trials.length, 0);
}

async function loadExpStruct(expStructId) {
    const filePath = `./expStructs_MCMC/expStruct_version${expStructId}.json`; // Use expStructId to construct the file path

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const expStruct = await response.json();
        return expStruct;
    } catch (error) {
        console.error('Error loading the experiment structure:', error);
    }
}


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
        iBlock,
        iTrial,
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

startBtn.addEventListener("click", startBlock);
boxContainer.addEventListener("mousemove", updateCursorPosition);
window.addEventListener("keydown", handleSpacebarPress);

function handleClick(event) {
    if (!event?.target?.dataset?.stimIndex) {
        console.error("Invalid click event or missing stimIndex!");
        showFeedback(false);
        endTrial();
        return;
    }

    const rect = boxContainer.getBoundingClientRect();
    const clickedIndex = parseInt(event.target.dataset.stimIndex, 10);
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    if (isNaN(clickedIndex) || clickedIndex < 0 || clickedIndex >= currentTrial.stimuli.length) {
        console.error("Invalid stimulus index:", clickedIndex);
        showFeedback(false);
        endTrial();
        return;
    }

    const clickedStimulus = currentTrial.stimuli.find(stim => stim.stimIndex === clickedIndex);
    if (!clickedStimulus) {
        console.error("Undefined stimulus at index:", clickedIndex);
        showFeedback(false);
        endTrial();
        return;
    }

    // Update click count and log the click
    clickedStimulus.clickCount = (clickedStimulus.clickCount || 0) + 1;
    clickedLocations.push({
        x: clickX,
        y: clickY,
        correct: clickedStimulus.targetCond === 1, // Using `targetCond` for correctness
        time: Date.now(),
        clickCount: clickedStimulus.clickCount,
        stimIndex: clickedIndex,
        targetCond: clickedStimulus.targetCond, 
    });

    // Determine correctness using `targetCond` (1 = target, 0 = distractor)
    trialCorrect = clickedStimulus.targetCond === 1;
    showFeedback(trialCorrect);
    endTrial();
}


function handleSpacebarPress(event) {
    if (event.code === "Space" && !spacePress) {
        spacePress = true;

        if (trialType == "target_absent") {
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
    clickedLocations = [];
    mouseTrajectory = [];
    if (experimentStartTime === null) {
        experimentStartTime = Date.now();
        console.log("Experiment start time:", experimentStartTime);
    }
    trialStartTime = Date.now();
    console.log("Trial #", iTrial, "start time:", trialStartTime);

    //Instead of generating currentTrial, grab from expStruct
    currentTrial = expStruct[iBlock].trials[iTrial];

    currentTrial.trialID = generateTrialID(),

    trialType = currentTrial.trialType;
    setSize = currentTrial.setSize;
    
    console.log("currentTrial:", currentTrial);
    currentTrial.stimuli.forEach(stim => stim.clickCount = 0);
    // console.log("Trial type for trial #", logCounter, ":", 
        // currentTrial.trialType);
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

    // Render stimuli for the current trial
    renderStimuli(currentTrial);
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
    setTimeout(startBlock, 1000);
}

// ============================
// Create and Present Stimuli
// ============================


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

function createStimulus(x, y, itemSize, isTarget, rotation) {
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
    //const randomRotation = Math.floor(Math.random() * 4) * 90;
    item.style.transform = `rotate(${rotation}deg)`;
    return item;
}

function renderStimuli(currentTrial) {
    if (!currentTrial) {
        console.error("currentTrial is not initialized");
        return;
    }
    
    //const possibleItemCounts = [1, 2, 4, 8, 12];
    numItems = currentTrial.setSize; 
    if (trialType == "target_present") {
        for (let stim of currentTrial.stimuli) {
            if (stim.targetCond === 1) {  // Use triple equals for strict comparison
                targetPosition = stim.stimIndex;
            }
        }
    }  else {
        targetPosition = -1;}
    // console.log("Target Position at start of trial:", targetPosition);
    
    const itemSize = 60; 
    const minDistance = itemSize + 10;
    const positions = [];
 
    for (let stim of currentTrial.stimuli) {
        const isTarget = stim.targetCond;
        const stimIndex = stim.stimIndex;
        const x = stim.xpos; // Use preloaded xpos
        const y = stim.ypos; // Use preloaded ypos
        const rotation = stim.rotation;
        positions.push({ x,y });

        const item = createStimulus(x, y, itemSize, isTarget, rotation);
        boxContainer.appendChild(item);

        // currentTrial.stimuli.push({
        //     stimIndex,
        //     x,
        //     y,
        //     itemSize,
        //     isTarget,
        //     clickCount: 0,
        // });

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
// ^ this makes sure that whatever happens in the function runs LAST; i.e., load all domain content then do X
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

// =================
// Experiment Loop
// =================

function startBlock() {
    clearDisplay();
    const messageBox = document.getElementById("message-box");
    if (iBlock < expStruct.length) {
        if (iTrial < expStruct[iBlock].trials.length) {
            messageBox.style.display = "none"; // Hide message
            startBtn.style.display = "none"; // Hide start button
            startTask();  // Start the trial
            iTrial++;  // Increment trial counter
        } else {
            iBlock++;  // Increment block counter
            iTrial = 0;  // Reset trial counter for the new block

            let message = "";
            if (iBlock < expStruct.length) {
                if (expStruct[iBlock - 1].isPractice) {
                    message = `Practice block ${iBlock} out of ${CONFIG.experimentDesign.N_PRACTICE_BLOCKS} completed!`;
                    if (expStruct[iBlock].isPractice == 0) {
                        message += `<br><br><b>IMPORTANT:</b> The main experiment starts in the next block.<br>`;
                    }
                    message += `<br>Blocks left: ${expStruct.length - iBlock}.`;
                } else {
                    message = `You have completed experiment block ${iBlock - CONFIG.experimentDesign.N_PRACTICE_BLOCKS} out of ${CONFIG.experimentDesign.N_BLOCKS}`;
                    message += `<br>Blocks left: ${expStruct.length - iBlock}.`;
                }
                message += `<br><br>Click the Start Task button to continue.`;
            } else {
                message = `<br><b>Experiment complete!</b><br>Press the next button to continue.`;

                expTrialsEndTime = Date.now();
                expTrialsDuration = expTrialsEndTime - expTrialsStartTime;
                data.expTrialsDuration = expTrialsDuration;
                console.log("expTrialsDuration logged");

                //show_startDemosButton();
            }

            // Display message in message box
            messageBox.innerHTML = message;
            messageBox.style.display = "block";

            // Show start button for user to continue
            startBtn.style.display = "block";
            startBtn.onclick = function () {
                messageBox.style.display = "none"; // Hide message
                startBtn.style.display = "none"; // Hide button
                startBlock();
            };
        }
    }
}

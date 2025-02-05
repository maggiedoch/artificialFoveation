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

// Ensure the mask covers the entire display
maskCanvas.width = boxContainer.clientWidth;
maskCanvas.height = boxContainer.clientHeight;
maskCanvas.style.position = "absolute"; // Ensure it overlays stimuli
maskCanvas.style.left = "0px";
maskCanvas.style.top = "0px";
maskCanvas.style.zIndex = "2"; // Ensure the mask is on top

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
let reducedSize = CONFIG.stimuli.SQUARE_SIZE * CONFIG.stimuli.REDUCTION_FACTOR / 2;

// Exp struct variables
const preload = 0;
let expStruct;

// Ensure foveation mask runs on page load
document.addEventListener("DOMContentLoaded", function () {
    drawFoveationMask(cursorX, cursorY);
});

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
canvas.addEventListener("click", handleClick);
canvas.addEventListener("mousemove", updateCursorPosition);
window.addEventListener("keydown", handleSpacebarPress);

function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    let clickedStimulus = null;

    for (let stim of stimulusCoordinates) {
        const stimLeft = stim.x - reducedSize;
        const stimRight = stim.x + reducedSize;
        const stimTop = stim.y - reducedSize;
        const stimBottom = stim.y + reducedSize;

        if (clickX >= stimLeft && clickX <= stimRight && clickY >= stimTop && clickY <= stimBottom) {
            clickedStimulus = stim;
            break;
        }
    }

    if (!clickedStimulus) {
        console.log("Click did not match any stimulus!");
        showFeedback(false);
        endTrial();
        return;
    }

    trialCorrect = clickedStimulus.isTarget;
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

    // Load the trial from expStruct
    currentTrial = expStruct[iBlock].trials[iTrial];

    currentTrial.trialID = generateTrialID();
    trialType = currentTrial.trialType;
    setSize = currentTrial.setSize;

    console.log("currentTrial:", currentTrial);
    currentTrial.stimuli.forEach(stim => stim.clickCount = 0);
    
    // **Render stimuli first**
    renderStimuli(currentTrial);

    // **Ensure foveation mask is drawn last**
    requestAnimationFrame(() => {
        drawFoveationMask(cursorX, cursorY);
    });
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

function drawT(x, y, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-CONFIG.stimuli.BAR_WIDTH / 2, -CONFIG.stimuli.BAR_LENGTH / 2 + CONFIG.stimuli.BAR_GAP, CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH); // Vertical bar
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2, -CONFIG.stimuli.BAR_LENGTH / 2, CONFIG.stimuli.BAR_LENGTH, CONFIG.stimuli.BAR_WIDTH); // Horizontal bar
    ctx.restore();
}

function drawL(x, y, color, rotation, offset) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2 + offset, -CONFIG.stimuli.BAR_LENGTH / 2 - CONFIG.stimuli.BAR_GAP, CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH);  //vertical bar
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2, CONFIG.stimuli.BAR_LENGTH / 2 - CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH, CONFIG.stimuli.BAR_WIDTH); // Horizontal bar
    ctx.restore();
}

function renderStimuli(currentTrial) {
    if (!currentTrial) {
        console.error("currentTrial is not initialized");
        return;
    }

    // ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous trial stimuli

    numItems = currentTrial.setSize; 
    if (trialType == "target_present") {
        for (let stim of currentTrial.stimuli) {
            if (stim.targetCond === 1) {  // Use triple equals for strict comparison
                targetPosition = stim.stimIndex;
            }
        }
    } else {
        targetPosition = -1;
    }

    for (let stim of currentTrial.stimuli) {
        const isTarget = stim.targetCond === 1;
        const x = stim.xpos; // Use preloaded xpos
        const y = stim.ypos; // Use preloaded ypos
        const rotation = stim.rotation;
        const color = "black"; // Set the color of the stimuli

        // Draw T or L based on target condition
        if (isTarget) {
            drawT(x, y, color, rotation);
        } else {
            drawL(x, y, color, rotation, CONFIG.stimuli.BAR_WIDTH / 2); // Adjust offset if necessary
        }

        // Store stimulus coordinates for tracking
        stimulusCoordinates.push({ x, y, isTarget });
    }

    drawFoveationMask(cursorX, cursorY); // Ensure the mask updates
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

// function updateCursorPosition(event) {
//     const rect = boxContainer.getBoundingClientRect();
//     cursorX = event.clientX - rect.left; // relative to boxContainer
//     cursorY = event.clientY - rect.top;  // relative to boxContainer

//     mouseTrajectory.push({
//         x: cursorX,
//         y: cursorY,
//         time: Date.now(),
//     });

//     trackDwellTime(cursorX, cursorY, currentTime);

//     // Clear the canvas to remove the previous ring
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     drawFoveationMask(cursorX, cursorY);
//     // cursorRing(cursorX, cursorY);
// }

function updateCursorPosition(event) {
    const rect = boxContainer.getBoundingClientRect();
    cursorX = event.clientX - rect.left; // relative to boxContainer
    cursorY = event.clientY - rect.top;  // relative to boxContainer

    mouseTrajectory.push({
        x: cursorX,
        y: cursorY,
        time: Date.now(),
    });

    trackDwellTime(cursorX, cursorY);

    // **Only redraw the foveation mask, NOT the stimuli**
    drawFoveationMask(cursorX, cursorY);
}


function cursorRing(cursorX, cursorY) {
    let cursorRadius = 25;
    ctx.beginPath(); 
    ctx.arc(cursorX, cursorY, cursorRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function trackDwellTime(cursorX, cursorY) {
    if (!currentTrial || !currentTrial.stimuli || currentTrial.stimuli.length === 0) return;

    let hoveredStim = null;

    for (let stim of stimulusCoordinates) {
        let reducedSize = CONFIG.stimuli.SQUARE_SIZE * CONFIG.stimuli.REDUCTION_FACTOR / 2;

        const stimLeft = stim.x - reducedSize;
        const stimRight = stim.x + reducedSize;
        const stimTop = stim.y - reducedSize;
        const stimBottom = stim.y + reducedSize;

        if (cursorX >= stimLeft && cursorX <= stimRight && cursorY >= stimTop && cursorY <= stimBottom) {
            hoveredStim = stim;
            break;
        }
    }

    if (!hoveredStim) {
        if (lastHoveredStimIndex !== null && entryTime !== null) {
            exitTime = Date.now();
            dwellDuration = exitTime - entryTime;
            if (dwellDuration >= 0) {
                stimuliDwellTime.push({
                    stimIndex: lastHoveredStimIndex,
                    entryTime: entryTime,
                    exitTime: exitTime,
                    totalDwellTime: dwellDuration,
                });
                console.log(`Dwell time logged for stimulus ${lastHoveredStimIndex}: ${dwellDuration} ms`);
            }
        }
        lastHoveredStimIndex = null;
        entryTime = null;
        return;
    }

    if (hoveredStim.stimIndex !== lastHoveredStimIndex) {
        if (lastHoveredStimIndex !== null && entryTime !== null) {
            exitTime = Date.now();
            dwellDuration = exitTime - entryTime;
            if (dwellDuration >= 0) {
                stimuliDwellTime.push({
                    stimIndex: lastHoveredStimIndex,
                    entryTime: entryTime,
                    exitTime: exitTime,
                    totalDwellTime: dwellDuration,
                });
            }
        }
        lastHoveredStimIndex = hoveredStim.stimIndex;
        entryTime = Date.now();
    }
}

// =================
// Foveation Mask
// =================

// function drawFoveationMask(cursorX, cursorY) {    
//     // Global mask layer
//     maskCtx.clearRect(0, 0, boxContainer.offsetWidth, 
//         boxContainer.offsetHeight); // Clear previous mask
//     maskCtx.fillStyle = "#e5e7e9";  // gray: #b7b7b7; light gray: #e5e7e9
//     maskCtx.globalAlpha = 1.0;
//     maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);  
    
//     // Local mask layer
//     maskCtx.fillStyle = "#000000";
//     maskCtx.font = "14px Arial";
//     maskCtx.textAlign = "center";
//     maskCtx.textBaseline = "middle";
//     stimulusCoordinates.forEach(({ x, y, reducedSize}) => {
//         const centerX = x + reducedSize / 2;
//         const centerY = y + reducedSize / 2;
//         maskCtx.fillText("X", centerX, centerY);
//     });

//     eraseFoveation(cursorX, cursorY, maskCtx);
//     maskCtx.restore();
// }

function drawFoveationMask(cursorX, cursorY) {    
    // **Global mask layer (fully opaque)**
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height); 
    maskCtx.fillStyle = "rgb(229, 231, 233)";  // Light gray with no transparency
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);  

    // **Local mask layer: add '+' marks at stimulus centers**
    maskCtx.fillStyle = "#000000";  // Black text
    maskCtx.font = "14px Arial";
    maskCtx.textAlign = "center";
    maskCtx.textBaseline = "middle";

    stimulusCoordinates.forEach(({ x, y }) => {
        maskCtx.fillText("+", x, y);
    });

    // **Erase foveation region at cursor location**
    eraseFoveation(cursorX, cursorY, maskCtx);
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

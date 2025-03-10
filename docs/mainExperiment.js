// =========================
// Global Initializations
// =========================

const subjectId = Math.floor(1000000000 + Math.random() * 9000000000); // random subjectId;
const experimentName = "Ts-and-Ls_with_mask";
const version = "pilot1";
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

let data = {}; // all data
let trialDataLog = [];
let startTime; 
let startDate; 
let experimentStartTime = null;

// Subject and Experiment Identifiers
let workerId;
let assignmentId;
let hitId;

let clickedLocations = [];
let clickedStimulus = null;
let mouseTrajectory = [];
let currentTrial;
let trialCounter = 0;
let logCounter = 0;
let trialCorrect = false;
let previousTrialCorrect = null;
let previousTrialSize = null;
let trialStartTime = [];
let isOutlierRT = null;
let stimulusCoordinates = [];
let trialType;
let setSize;
let targetPosition;
let numItems;
let iBlock = 0;
let iTrial = 0;
let reducedSize = CONFIG.stimuli.SQUARE_SIZE * CONFIG.stimuli.REDUCTION_FACTOR / 2;

// For preventing multiple clicks or spacebar presses
let trialActive = null;

// Exp struct variables
const preload = 1;
let expStruct;
const expStructId = Math.floor(Math.random() * 240) + 1; // Randomly generate an ID between 1 and 240


document.addEventListener("DOMContentLoaded", function () {
    // Initialize foveation mask
    drawFoveationMask(cursorX, cursorY);

    // Start time and duration
    const start = new Date();
    const month = start.getMonth() + 1;  // Convert from 0-based index
    const pad = num => num.toString().padStart(2, '0'); // Ensure two-digit formatting
    startTime = pad(start.getHours()) + "-" + pad(start.getMinutes()) + "-" + pad(start.getSeconds());
    startDate = pad(month) + "-" + pad(start.getDate()) + "-" + start.getFullYear();
    experimentStartTime = Date.now(); // Store timestamp globally
    console.log(startTime);

    // Subject and Experiment Identifiers
    workerId = getURLParameter('PROLIFIC_PID') || null;
    assignmentId = getURLParameter('SURVEY_CODE') || null; //sona_id
    hitId = getURLParameter('SESSION_ID') || null;

    // Load experiment structure
    if (preload === 0) {
        expStruct = makeExpStruct();
        initializeData();
    } else {
        loadExpStruct(expStructId)
            .then(loadedExpStruct => {
                expStruct = loadedExpStruct;
                initializeData(); // Initialize data **after** structure is loaded
                console.log(data);
                console.log("condition load success");
            })
            .catch(error => {
                console.error("Error:", error);
            });
    }
});

async function loadExpStruct(expStructId) {
    const filePath = `./Ts-and-Ls_with_mask_ExpStructs_MCMC/expStruct_version${expStructId}.json`; // Use expStructId to construct the file path

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
// Misc
// ===============
function getURLParameter(name) {
    // for getting MTurk URL elements
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

// ===============
// Data Logging
// ===============
function initializeData() {
    data = {
        subjectId: subjectId,
        startDate: startDate,
        startTime: startTime,
        experimentStartTime: experimentStartTime,
        experimentName: experimentName,
        version: version,
        assignmentId: assignmentId,
        workerId: workerId,
        hitId: hitId,
        demographics: {}, //fill later
        config: CONFIG,
        expStructId: expStructId,
        expStruct: expStruct,
        trialDataLog: trialDataLog
    };
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
        };
    });

    // Check for outlier RTs
    if (totalSearchTime <= 100) {
        isOutlierRT = true;
    } else if (totalSearchTime >= 15000) {
        isOutlierRT = true;
    } else {
        isOutlierRT = false;
    }

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
        isOutlierRT,
        hitCount,
        faCount,
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

// ===============
// Demographics 
// ===============

// Call this to submit data when the demographics form is completed
document.querySelector('#demoInfo form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission
    
    // Clear previous error messages
    const previousErrors = document.querySelectorAll('.error-message');
    previousErrors.forEach(error => error.remove());
    
    // Initialize a variable to keep track of the form validity
    let formValid = true;
    
    // Validate Gender Section
    const genderSelect = this.querySelector('#genderList');
    if (genderSelect.value === '' || genderSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a gender.';
        genderSelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Age Section
    const ageSelect = this.querySelector('#ageList');
    if (ageSelect.value === '' || ageSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a birth year.';
        ageSelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Race Section
    const checkboxGroup = this.querySelectorAll('input[type="checkbox"][name="race"]');
    const checkedCheckboxes = Array.from(checkboxGroup).filter(checkbox => checkbox.checked);
    if (checkedCheckboxes.length === 0) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select at least one race.';
        checkboxGroup[0].parentNode.appendChild(errorMessage);
    }

    // Validate Ethnicity Section
    const ethnicitySelect = this.querySelector('#ethnicity');
    if (ethnicitySelect.value === '' || ethnicitySelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select an ethnicity.';
        ethnicitySelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Device Information Section
    const deviceSelect = this.querySelector('#deviceList');
    if (deviceSelect.value === '' || deviceSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a device.';
        deviceSelect.parentNode.appendChild(errorMessage);
    }
    
    // If form is not valid, return early
    if (!formValid) {
        return;
    }
    
    // If form is valid, collect demographic data and send it
    const experimentEndTime = Date.now();
    data.experimentDuration = experimentEndTime - experimentStartTime;
    collectDemographicData();
    sendData(data);
});

function collectDemographicData() {

    // Collecting gender
    var genderElement = document.getElementById('genderList');
    var gender = genderElement.value;

    // Collecting age
    var ageElement = document.getElementById('ageList');
    var age = ageElement.value;

    // Collecting race
    var raceElements = document.getElementsByName('race');
    var races = [];
    for (var i = 0; i < raceElements.length; i++) {
        if (raceElements[i].checked) {
            races.push(raceElements[i].value);
        }
    }

    // Collecting ethnicity
    var ethnicityElement = document.getElementById('ethnicity');
    var ethnicity = ethnicityElement.value;

    // Collecting device information
    var deviceElement = document.getElementById('deviceList');
    var device = deviceElement.value;

    // Collecting general feedback
    var feedbackElement = document.getElementById('feedback');
    var feedback = feedbackElement.value; // Retrieve the feedback from the textarea

    // Adding the collected information to the data object
    data.demographics = {
        gender: gender,
        yearOfBirth: age,
        race: races,
        ethnicity: ethnicity,
        device: device,
        feedback: feedback
    };
}

// ===============
// Calling sendData.php to upload data to server
// ===============

// Routing to prolific submission page
function sendData(data) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://52.0.147.87/experiments/Ts_and_Ls_with_mask/docs/saveData.php', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            // Check the response text from the PHP script
            const responseStatus = xhr.responseText;

            // Log a message indicating success or failure
            console.log("Data sent response: " + responseStatus);
            window.location.href = "https://gwu.sona-systems.com/webstudy_credit.aspx?experiment_id=1213&credit_token=d1c1a81560774ef289dc11abf8dd420d&survey_code="+assignmentId // replace with appropriate redirect url
        }
    };
    xhr.send(JSON.stringify(data));
}

// =====================================
// Handle Clicks and Spacebar Presses
// =====================================

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

    if (!trialActive) return; // Ignore extra clicks if trial is over

    for (let stim of currentTrial.stimuli) {
        const stimLeft = stim.xpos - reducedSize;
        const stimRight = stim.xpos + reducedSize;
        const stimTop = stim.ypos - reducedSize;
        const stimBottom = stim.ypos + reducedSize;

        if (clickX >= stimLeft && clickX <= stimRight && clickY >= stimTop && clickY <= stimBottom) {
            clickedStimulus = stim;

            // **Ensure clickCount exists before incrementing**
            if (clickedStimulus.clickCount === undefined) {
                clickedStimulus.clickCount = 0;
            }
            clickedStimulus.clickCount++; // Increment click count
            break; // Exit loop after finding the clicked stimulus
        }
    }

    if (clickedStimulus) {
        // **Record click details for valid stimulus**
        clickedLocations.push({
            x: clickX,
            y: clickY,
            correct: clickedStimulus.targetCond === 1, // True if stimulus is a target
            time: new Date().getTime() - trialStartTime,
            clickCount: clickedStimulus.clickCount, // Store updated click count
            stimIndex: clickedStimulus.stimIndex,
            targetCond: clickedStimulus.targetCond,
            salience: clickedStimulus.salience || null, // Default to null if not defined
            offset: clickedStimulus.offset || null,
            rotation: clickedStimulus.rotation || null,
        });

        trialCorrect = clickedStimulus.targetCond === 1; // Fix incorrect variable
        showFeedback(trialCorrect);
    } else {
        // **Record click details for a miss**
        console.log("Click did not match any stimulus!");
        clickedLocations.push({
            x: clickX,
            y: clickY,
            correct: 0, // False for incorrect clicks
            time: new Date().getTime() - trialStartTime,
        });

        showFeedback(false);
    }

    console.log(clickedLocations)

    endTrial();
}

function handleSpacebarPress(event) {
    // Ignore if trial is inactive
    if (!trialActive || event.code !== "Space") return;
    
    if (event.code === "Space" && !spacePress) {
        spacePress = true;

        if (trialType == "target_absent") {
            trialCorrect = true;
        } else {
            trialCorrect = false;
        }

        console.log("Spacebar pressed. trialType:", trialType,
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
    // console.log("Feedback displayed:", isCorrect ? "Correct" : "Incorrect");
}

// ================
// Hover Circle
// ================

let hintHovered = false;
let hoverStartTime = null;

function drawCenterHint() {
    // **Ensure the foveation mask is hidden**
    document.getElementById("foveation-mask").style.display = "none"; 

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // **Show the cursor inside the box-container**
    document.getElementById("box-container").style.cursor = "default";  

    // **Fill the entire canvas with gray (same as foveation mask)**
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(229, 231, 233)"; // Gray background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // **Draw the hover circle**
    ctx.fillStyle = "rgb(0, 0, 0)"; // Black
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, CONFIG.display.HINT_CIRCLE_RADIUS * 2, 0, 2 * Math.PI);
    ctx.fill();

    // **Draw hover instruction text**
    ctx.font = "12px Arial";  
    ctx.fillStyle = "#818589";  // Grayish text
    ctx.textAlign = "center";
    ctx.fillText("Hover cursor over circle to start next trial", canvas.width / 2, canvas.height / 2 - 15); 

    ctx.restore();

    canvas.addEventListener('mousemove', handleCircleHover);
}

function handleCircleHover(event) {
    // draws starting hover circle, then renders stimuli when hover condition is met

    // Get the canvas boundaries
    const rect = canvas.getBoundingClientRect();

    // Calculate the current mouse position relative to the canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Define the center of the circle and its radius
    // The radius is twice the size of the displayed circle for a more forgiving hover detection area
    const circleCenterX = canvas.width / 2;
    const circleCenterY = canvas.height / 2;
    const circleRadius = CONFIG.display.HINT_CIRCLE_RADIUS * 2; 

    // Calculate the distance between the mouse pointer and the center of the circle
    const distanceFromCenter = Math.sqrt((mouseX - circleCenterX) ** 2 + (mouseY - circleCenterY) ** 2);
    
    // Check if the distance calculated is less than or equal to the circle's radius
    if (distanceFromCenter <= circleRadius) {
        // If it is the first time the mouse has hovered over the circle during this check
        if (!hintHovered) {
            hintHovered = true;
            hoverStartTime = new Date().getTime(); // Record the hover start time
        } 
        // If the mouse has been hovering over the circle
        else {
            const currentTime = new Date().getTime();
            
            // Calculate the total hover time
            const elapsed = currentTime - hoverStartTime;    
            
            // If the hover time exceeds the specified duration, render stimuli
            if (elapsed >= CONFIG.display.HOVER_DURATION) {
                canvas.removeEventListener('mousemove', handleCircleHover);
                
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
                
                // **Restore foveation mask**
                document.getElementById("foveation-mask").style.display = "block";
                document.body.style.backgroundColor = ""; // Reset background color

                // **Hide the cursor again when trial starts**
                document.getElementById("box-container").style.cursor = "none"; 

                setTimeout(() => {
                    renderStimuli(currentTrial); // Call the function to render stimuli
                }, CONFIG.display.DELAY_BEFORE_TRIAL);
            }
        }
    } 
    // If the mouse is outside the circle, reset the hovered state
    else {
        hintHovered = false;
    }
}

// ======================
// Start and End Trials
// ======================

function startTrial() {
    
    clickedLocations = [];
    mouseTrajectory = [];
    
    if (experimentStartTime === null) {
        experimentStartTime = Date.now();
        console.log("Experiment start time:", experimentStartTime);
    }

    hoverStartTime = Date.now();
    console.log("Trial #", iTrial, "hover start time:", hoverStartTime);

    // Load the trial from expStruct
    currentTrial = expStruct[iBlock].trials[iTrial];

    trialType = currentTrial.trialType;
    setSize = currentTrial.setSize;

    console.log("currentTrial:", currentTrial);
    currentTrial.stimuli.forEach(stim => stim.clickCount = 0);

    // draw center hint
    drawCenterHint();
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
    trialActive = false; // Ignore any clicks or presses till next trial
    hintHovered = false;
    hintStartTime = null;

    // Log data
    logCounter++;
    data.trialDataLog.push(logTrialData());
    spacePress = false;
    previousTrialCorrect = trialCorrect;
    previousTrialSize = currentTrial.setSize;
    
    setTimeout(() => {
        startBlock();
    }, CONFIG.display.MIN_FEEDBACK_DURATION);
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
    trialStartTime = Date.now();
    console.log("Start time:", trialStartTime);

    trialActive = true; // Clicks and presses are allowed

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
        const stimIndex = stim.stimIndex;
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

        // Store stimulus coordinates for foveation mask
        stimulusCoordinates.push({ stimIndex, x, y, isTarget });
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
    maskCtx.arc(cursorX, cursorY, 37.5, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();
}

// =================
// Experiment Loop
// =================

// kick off the experiment
show_consent();

function showTask() {
    let boxContainer = document.getElementById("box-container");
    let foveationMask = document.getElementById("foveation-mask");
    let startButton = document.getElementById("start-btn");

    // Show box container smoothly
    boxContainer.style.visibility = "visible";
    boxContainer.style.opacity = "1";

    // Ensure foveation mask is visible
    foveationMask.style.visibility = "visible";
    foveationMask.style.opacity = "1";

    // Show the start button
    startButton.style.display = "block";

    hideAllInstructionDivs();

}

function startBlock() {
    clearDisplay();
    const messageBox = document.getElementById("message-box");
    
    if (iBlock < expStruct.length) {
        if (iTrial < expStruct[iBlock].trials.length) {
            messageBox.style.display = "none"; // Hide message
            startBtn.style.display = "none"; // Hide start button
            startTrial();  // Start the trial
            iTrial++;  // Increment trial counter
        } else {
            // Move to the next block
            iBlock++;  
            iTrial = 0;  
            previousTrialCorrect = null;

            if (iBlock < expStruct.length) {
                // Show block transition message
                let message = expStruct[iBlock - 1].isPractice
                    ? `Practice block ${iBlock} out of ${CONFIG.experimentDesign.N_PRACTICE_BLOCKS} completed!`
                    : `You have completed experiment block ${iBlock - CONFIG.experimentDesign.N_PRACTICE_BLOCKS} out of ${CONFIG.experimentDesign.N_BLOCKS}`;

                if (expStruct[iBlock - 1].isPractice && expStruct[iBlock].isPractice == 0) {
                    message += `<br><br><b>IMPORTANT:</b> The main experiment starts in the next block.<br>`;
                }

                message += `<br>Blocks left: ${expStruct.length - iBlock}.`;
                message += `<br><br>Click the Start Task button to continue.`;

                messageBox.innerHTML = message;
                messageBox.style.display = "block";

                // Show the start button for the next block
                startBtn.style.display = "block";
                startBtn.onclick = function () {
                    messageBox.style.display = "none";
                    startBtn.style.display = "none";
                    startBlock();
                };
            } else {
                // Experiment is complete
                messageBox.innerHTML = `<br><b>Experiment complete!</b><br>Press the next button to continue.`;
                messageBox.style.display = "block";

                // Ensure start button is hidden at the end
                startBtn.style.display = "none";

                // Show demographic form button instead
                show_startDemosButton();
            }
        }
    }
}

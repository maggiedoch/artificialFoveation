// Notes:
// Only black stimuli, no salience variation
// Varying set size: 4 12, 20

//----------------------------------
// EXPERIMENT CONFIG
//----------------------------------

const CONFIG = {
	stimuli:{
		// stimuli display properties
		BAR_WIDTH: 10, // only used in VS.js when drawing stim
		BAR_LENGTH: 30,
		BAR_GAP: 12, // gap between horizontal and vertical bars
		L_MAX_JITTER: 6, // the larger this number and closer it is to BAR_LENGTH/2, the more Ls look like Ts
		MIN_STIM_GAP: 8, // for best results make sure that this is more than BAR_GAP/2
        SET_SIZE: [4, 12, 20],
		GRID_ROWS: 6, // even numbers are better to make sure hover circle doesn't cover stimulus
		GRID_COLS: 8,
		SQUARE_SIZE: 80,
		POSSIBLE_ROTATIONS: [0, 90, 180, 270],
		RANGE_SALIENCE: [100, 100], // No salience variation in this version
        REDUCTION_FACTOR: 0.70 // Reducing the bounding box (from the stim grid) for counting a click as a stimulus selection; 60% of original size
	},
	experimentDesign:{
		// num of practice and experiment blocks
		N_PRACTICE_BLOCKS: 1,
		N_BLOCKS: 3
	},
	practiceTrialsConditions: {
		// total num of trials in each condition across all practice blocks
		N_TARGET_PRESENT: 4,
		N_TARGET_ABSENT: 4
	},
	experimentTrialsConditions: {
		// total num of trials in all conditions across all experiment blocks
		N_TARGET_PRESENT: 36,
		N_TARGET_ABSENT: 36
	},
	display: {
		// other vars not relevant to constructing expStruct
		DELAY_BEFORE_TRIAL: 300, // in exp trials the total ITI is this plus MIN_FEEDBACK_DURATION
		HINT_CIRCLE_RADIUS: 2.5,
		HOVER_DURATION: 130,
		MIN_FEEDBACK_DURATION: 500, // delay between drawing feedback and showing hover
		MIN_SEARCH_TIME: 500,
		MAX_SEARCH_TIME: 15000,
        MOUSE_TRACKING_INTERVAL: 25 // time in milliseconds, adjust as needed
	},
	canvasDimensions: {
		canvasWidth: canvas.width,
		canvasHeight: canvas.height,
	}
};

//----------------------------------
// GRID SETUP
//----------------------------------

// Calculate dimensions and starting positions
const GRID_WIDTH = CONFIG.stimuli.GRID_COLS * CONFIG.stimuli.SQUARE_SIZE;
const GRID_HEIGHT = CONFIG.stimuli.GRID_ROWS * CONFIG.stimuli.SQUARE_SIZE;
const START_X = (canvas.width - CONFIG.stimuli.GRID_COLS * CONFIG.stimuli.SQUARE_SIZE) / 2 + CONFIG.stimuli.SQUARE_SIZE / 2;
const START_Y = (canvas.height - CONFIG.stimuli.GRID_ROWS * CONFIG.stimuli.SQUARE_SIZE) / 2 + CONFIG.stimuli.SQUARE_SIZE / 2;
const XY_MAX_JITTER = (CONFIG.stimuli.SQUARE_SIZE - CONFIG.stimuli.BAR_LENGTH - CONFIG.stimuli.BAR_GAP)/2 - CONFIG.stimuli.MIN_STIM_GAP;

// Generate preset locations based on the grid parameters
const presetLocations = [];
for (let row = 0; row < CONFIG.stimuli.GRID_ROWS; row++) {
    for (let col = 0; col < CONFIG.stimuli.GRID_COLS; col++) {
        presetLocations.push({
            x: START_X + col * CONFIG.stimuli.SQUARE_SIZE,
            y: START_Y + row * CONFIG.stimuli.SQUARE_SIZE
        });
    }
}

//--------------------------------
// BLOCK, TRIAL, STIMULUS CLASSES
//--------------------------------

class Block {
	constructor(isPractice, trials) {
	  this.isPractice = isPractice;
	  this.trials = trials;
	}
}
  
class Trial {
	constructor(trialType, setSize, stimuli) {
	  this.trialType = trialType; // target condition
	  this.stimuli = stimuli; // stimulus array
	  this.setSize = setSize;
	}
}

// Define the Stimulus class
class Stimulus {
	constructor(stimIndex,xpos, ypos, rgb, salience, offset, rotation, targetCond){
	  this.stimIndex = stimIndex;
	  this.xpos = xpos;
	  this.ypos = ypos;
	  this.rgb = rgb;
	  this.salience = salience
	  this.offset = offset;
	  this.rotation = rotation;
	  this.targetCond = targetCond;
	  this.clickCount = 0; //track click count
	}
}

//---------------------------
// STIMULUS CLASS FUNCTIONS
//---------------------------
// unless otherwise noted all stim class functions 
// take stimulus index as an input &
// returns stimulus properties as an output

// structural function to generate a stimulus object
const generateStimuli = (xpos, ypos, rgb, salience, offset, rotation, targetCondition, clickCount) => {
return new Stimulus(xpos, ypos, rgb, salience, offset, rotation, targetCondition, clickCount);
}

// xpos with jitter
const jitteredX = (index,shuffledLocations) => {
	// input index and array of shuffled starting locations
	const jitterX = Math.floor((Math.random() * 2 - 1) * XY_MAX_JITTER);
	return shuffledLocations[index].x + jitterX;
}

// ypos with jitter
const jitteredY = (index,shuffledLocations) => {
	const jitterY = Math.floor((Math.random() * 2 - 1) * XY_MAX_JITTER);
	return shuffledLocations[index].y + jitterY;
}

// rgb value and salience
const generateColorSalience = (index) => {
	// outputs object with two values:
	// 1. rgb value of stim color (grey of varying % black)
	// 2. label whether this color is high or low salience

	let rgb, salience;
	rgb = generateGreyColor(CONFIG.stimuli.RANGE_SALIENCE);
	salience = 'high'; // always high
  
	return { rgb, salience };
}

// L-offset
const generateOffset = (index) => {
	// used to jitter L bar rightwards, this stim property is only used in main functions if targ = 0
	return Math.floor(Math.random() * (CONFIG.stimuli.L_MAX_JITTER + 1)); 
}
  
// rotation
const generateRotation = (index) => {
	return CONFIG.stimuli.POSSIBLE_ROTATIONS[Math.floor(Math.random() * CONFIG.stimuli.POSSIBLE_ROTATIONS.length)];
}

// target condition
const generateTarget = (index, trialType) => {
	// input: index and trialType (experiment conditions: target present or target absent)
	if (trialType === "target_present") {
		return index === 0 ? 1 : 0;
	} else { // no target
		return 0
	}
}
  
//----------------------------------
// MAIN FUNCTIONS
//----------------------------------

// input: 1) num of trials to create 2) which target condition 3) what set size
// output: trial object with properties: 1) trial condition 2) stimulus array

function createTrials(nTrials, trialType, setSize) {
    let trials = [];
    
    for (let i = 0; i < nTrials; i++) {
        const shuffledLocations = shuffle([...presetLocations]); // shuffle preset locations for each trial

        //stimuli loop
        const stimuli = Array.from({ length: setSize }, (_, index) => {
            const stimIndex = index;
            const xpos = jitteredX(index, shuffledLocations);
            const ypos = jitteredY(index, shuffledLocations);
            const { rgb, salience } = generateColorSalience(index);
            const offset = generateOffset(index);
            const rotation = generateRotation(index);
            const targetCondition = generateTarget(index, trialType); // is T or L
            return new Stimulus(stimIndex, xpos, ypos, rgb, salience, offset, rotation, targetCondition);
        });

        trials.push(new Trial(trialType, setSize, stimuli));
    }

    return trials;
}

function makeExpStruct() {

    // Create practice trials and shuffle them
    let practiceTrials = [];
	for (let trialType in CONFIG.practiceTrialsConditions) {
        let readableTrialType;
        if (trialType === 'N_TARGET_PRESENT') readableTrialType = 'target_present';
        else if (trialType === 'N_TARGET_ABSENT') readableTrialType = 'target_absent';
        const totalTrialsForType = CONFIG.practiceTrialsConditions[trialType];
        const trialsPerSetSize = totalTrialsForType / CONFIG.stimuli.SET_SIZE.length; 	// trials of different set sizes are evenly distributed across trial types
        for (const setSize of CONFIG.stimuli.SET_SIZE) {
            practiceTrials.push(...createTrials(trialsPerSetSize, readableTrialType, setSize));
        }
    }

    // Create experimental trials
	let experimentTrials = [];
    for (let trialType in CONFIG.experimentTrialsConditions) {
        let readableTrialType;
        if (trialType === 'N_TARGET_PRESENT') readableTrialType = 'target_present';
        else if (trialType === 'N_TARGET_ABSENT') readableTrialType = 'target_absent';
        const totalTrialsForType = CONFIG.experimentTrialsConditions[trialType];
        const trialsPerSetSize = totalTrialsForType / CONFIG.stimuli.SET_SIZE.length; 	// trials of different set sizes are evenly distributed across trial types
        for (const setSize of CONFIG.stimuli.SET_SIZE) {
            experimentTrials.push(...createTrials(trialsPerSetSize, readableTrialType, setSize));
        }
    }
    
	// Create balanced blocks and push to expStruct
    const propertiesToGroupBy = ['trialType', 'setSize'];
    const experimentBlocks = distributeTrialsEqually(experimentTrials, CONFIG.experimentDesign.N_BLOCKS, propertiesToGroupBy);
    const practiceBlocks = distributeTrialsEqually(practiceTrials, CONFIG.experimentDesign.N_PRACTICE_BLOCKS, propertiesToGroupBy);

    // Convert arrays of trial arrays into Block objects and push to expStruct
    const expStruct = [];

    // Add practice blocks to expStruct
    for (const practiceBlockTrials of practiceBlocks) {
        const block = new Block(true, practiceBlockTrials);
        expStruct.push(block);
    }

    // Add experiment blocks to expStruct
    for (const experimentBlockTrials of experimentBlocks) {
        const block = new Block(false, experimentBlockTrials);
        expStruct.push(block);
    }

    return expStruct;
}
  
//----------------------------------
// UTILITY FUNCTIONS
//----------------------------------

function shuffle(array) {
    let currentIndex = array.length, randomIndex, tempValue;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        tempValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = tempValue;
    }
    return array;
}

// takes [min percent black, max percent black] and outputs a random rgb value within this percentage black range
function generateGreyColor(percentBlackRange) {
	// Extract the min and max percentage from the array
	const [minPercentBlack, maxPercentBlack] = percentBlackRange;
	// Generate a random percentage within the specified range
	const randomPercentBlack = Math.random() * (maxPercentBlack - minPercentBlack) + minPercentBlack;
	// Convert this percentage to an integer between 0 and 255
	const greyValue = Math.floor((1 - (randomPercentBlack / 100)) * 255);
	// Create the RGB color string
	const rgbColor = `rgb(${greyValue}, ${greyValue}, ${greyValue})`;
	return rgbColor;
}

// distributes an array of trials evenly across nBlocks according to specified grouping properties (i.e., IVs to counterbalance)
function distributeTrialsEqually(trials, nBlocks, properties) {
    const groups = new Map();
    
    // 1. Group by provided properties
    for (const trial of trials) {
        let key = "";
        for (const prop of properties) {
            key += `${trial[prop]}_`;
        }
        key = key.slice(0, -1); // Remove the trailing underscore

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(trial);
    }

    const blocks = Array.from({ length: nBlocks }, () => []);
    
    // 2. Distribute trials from each group evenly across the blocks
    for (const [key, groupTrials] of groups.entries()) {
        const trialsPerBlock = groupTrials.length / nBlocks;
        for (let i = 0; i < nBlocks; i++) {
            const startIdx = i * trialsPerBlock;
            const endIdx = startIdx + trialsPerBlock;
            blocks[i].push(...groupTrials.slice(startIdx, endIdx));
        }
    }

    // 3. Shuffle the trials within each block
    for (const block of blocks) {
        shuffle(block);
    }

    return blocks;
}

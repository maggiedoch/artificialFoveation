// functions for showing consent, instructions, demographics

// ==============================
// Consent
// ==============================

function show_consent() {
    document.getElementById('consentFormSection').style.display = 'block';
}

document.getElementById('consentCheckbox').addEventListener('change', function() {
    document.getElementById('startInstructionsButton').disabled = !this.checked;
});

// ==============================
// Instructions
// ==============================

function startInstructions() {
    // Hide consent form and show the first page of the experiment
    document.getElementById('consentFormSection').style.display = 'none';
    document.getElementById('instructions_page1').style.display = 'block';
}

function transitionInstructions(hideId, showId, imageUpdates = []) {
    if(hideId) document.querySelector(`#${hideId}`).style.display = 'none';
    if(showId) document.querySelector(`#${showId}`).style.display = 'block';

    imageUpdates.forEach(update => {
        document.querySelector(`#${update.id}`).src = update.src;
    });
}

function show_instructions1() {
    transitionInstructions(null, 'instructions_page1');
}

function show_instructions2() {
    transitionInstructions('instructions_page1', 'instructions_page2', [
        {id: 'Example_Ls', src: 'instrPics/Example_Lstim.png'},
        {id: 'Example_Ts', src: 'instrPics/Example_Tstim.png'}
    ]);
}

function show_instructions3() {
    transitionInstructions('instructions_page2', 'instructions_page3', [
        {id: 'Example_TargetPresent', src: 'instrPics/Example_TargetPresent.png'},
        {id: 'Example_TargetAbsent', src: 'instrPics/Example_TargetAbsent.png'}
    ]);
}

function show_instructions4() {
    transitionInstructions('instructions_page3', 'instructions_page4', [
        {id: 'ClickProgression', src: 'instrPics/ClickProgression.png'}
    ]);
}

function show_instructions5() {
    transitionInstructions('instructions_page4', 'instructions_page5', [
        {id: 'Hover_Cursor', src: 'instrPics/HoverCircle_Cursor.png'}
    ]);
}

function show_instructions6() {
    transitionInstructions('instructions_page5', 'instructions_page6', [
        {id: 'CorrectClick', src: 'instrPics/Correct_Click.png'},
        {id: 'IncorrectClick', src: 'instrPics/Incorrect_Click.png'},
        {id: 'MissedTarget', src: 'instrPics/Missed_Target.png'},
    ]);
}

function show_instructions7() {
    transitionInstructions('instructions_page6', 'instructions_page7', [
    ]);
}

function hideAllInstructionDivs() {
    const instructionDivs = document.querySelectorAll('.instructionsDiv');
    instructionDivs.forEach(div => div.style.display = 'none');
}

// ==============================
// Demographics
// ==============================

function show_startDemosButton() {
    document.getElementById('startDemosButton').style.display = 'block';
}

function showDemographicForm() {
    // Hide the canvas
    document.getElementById('canvas').style.display = 'none';

    // Show the demographics form
    document.getElementById('demoInfo').style.display = 'block';

    // Hide the "next" button
    document.getElementById('startDemosButton').style.display = 'none';
}
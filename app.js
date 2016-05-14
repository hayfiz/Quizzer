var main = function() {
    
    $("#addQuestionBtn").click(function addQuestion() {
            
        var selectorPresent = document.getElementById("questionTypeDropDown");
        if (selectorPresent == null) {
            $( "#questions" ).append(addQuestionTypeSelector());
                questionCount++;
                /* Question type drop down event listeners*/
                $("#questionTypeDropDown").change( function(e) {
                e.preventDefault();
                if ($(this).val()==='True/False') {
                    $( "#questions" ).append(createTrueFalse());
                    $("#questionTypeDropDown").remove();
                }
                else if ($(this).val()==='Multiple Choice') {
                    $( "#questions").append(addMultipleChoiceSelector());
                    $("#numberOfOptionsDropdown").change (function(e) {
                        e.preventDefault();
                        $( "#questions" ).append(createMultipleChoice($(this).val()));
                        $("#numberOfOptionsDropdown").remove();
                    });
                    $("#questionTypeDropDown").remove();
                }
                else {
                    return null;
                }  
            });
        }
        else {
            null;
        };
    });
    
    $("#createNewQuiz").submit(function(e) {
//        e.preventDefault();
//        //alert(JSON.stringify($('#createNewQuiz').serializeArray()));
//        
//        $.ajax({
//            type:'POST',
//            url: $('#createNewQuiz').attr('action'),  
//            data: JSON.stringify($('#createNewQuiz').serializeArray()),
//            'contentType':'application/json'
//        })
//        .success(function(data){
//             
//        });
//        
//        return false;
//        
//        
    });
    
};

/*Question Type Constructors*/

var questionTypes = ['Select Question Type', 'True/False', 'Multiple Choice'];

function createQuestionInput() {
    var questionText = document.createElement("input");
                            questionText.type = 'question_'+questionCount+'_text';
                            questionText.name =   'questions_'+questionCount+'_text';
                            //questionText.name = 'questions_'+questionCount+'][text]';
    return questionText;
};

// question_123_type

function createTrueFalse() {
                var trueFalse = $('<div></div>');
                    trueFalse.id = 'Question '+questionCount;
                        var trueChoice = document.createElement("input");
                            trueChoice.type = 'radio';
                            trueChoice.name = 'questions_'+questionCount+'_correctOption';
                            trueChoice.innerHTML = 'True';
                            trueChoice.value = 'True';
                        var falseChoice = document.createElement("input");
                            falseChoice.type = 'radio';
                            falseChoice.name = 'questions_'+questionCount+'_correctOption';
                            falseChoice.innerHTML = 'False';
                            falseChoice.value = 'False';
    
                    trueFalse.append(createQuestionInput());
                    trueFalse.append(trueChoice);
                    trueFalse.append(falseChoice);
                    trueFalse.append($('<input />').attr('name','questions_'+questionCount+'_type').attr('value','true/false').attr('type', 'hidden'));
                   trueFalse.append(addDeleteButton());
                return trueFalse;
            };

function createMultipleChoice(numberOfOptions) {
                
                /* Question div element */
                var multipleChoice =$('<div></div>');
                    multipleChoice.id = 'Question '+questionCount;
                
                /* Append question input */
                    multipleChoice.append(createQuestionInput());
                
                /* Append options */
                    for (var i = 0; i < numberOfOptions; i++) {
                        /* Choices Div element */
                        var choice = $('<div></div>');
                            choice.id = 'choice '+i; 
                            /* Option elements */
                            var possibleOption = document.createElement("input");
                                possibleOption.type = 'radio';
                                possibleOption.name = 'question_'+questionCount+'_correctOption';
                                possibleOption.value = i;
                            var option = document.createElement("input");
                                option.type = 'text';
                                option.name = 'questions_'+questionCount+'_Optiontext';
                        
                            /* Append options to choice div */
                            choice.append(possibleOption);
                            choice.append(option);
                        
                        /* Append choice to question*/
                        multipleChoice.append(choice);

                    };
                        multipleChoice.append($('<input />').attr('name','questions_'+questionCount+'_type').attr('value','multipleChoice').attr('type', 'hidden'));
                    multipleChoice.append(addDeleteButton());
                return multipleChoice;
            };

/* Selectors */

function addQuestionTypeSelector() {
    var questionTypeDropDownDiv = document.createElement("div");
            questionTypeDropDownDiv.id = 'questionTypeDropDownDiv';
            var questionTypeDropDown = document.createElement("select");
                questionTypeDropDown.id = 'questionTypeDropDown';
                var classAtt = document.createAttribute("class");
                classAtt.value = 'form-control';
                questionTypeDropDown.setAttributeNode(classAtt);
            for (var i = 0; i < questionTypes.length; i++) {
                var option = document.createElement("option");
                    option.id = 'questionType '+ (i+1);
                    option.value = questionTypes[i];
                    option.innerHTML = questionTypes[i];
                questionTypeDropDown.appendChild(option);
            questionTypeDropDownDiv.appendChild(questionTypeDropDown);
            };
    return questionTypeDropDownDiv;
};

function addMultipleChoiceSelector() {
    var numberOfOptionsDiv = document.createElement("div");
        numberOfOptionsDiv.id = 'numberOfOptionsDiv';
        
        var numberOfOptionsDropdown = document.createElement("select");
            numberOfOptionsDropdown.id = 'numberOfOptionsDropdown'
            var classAtt = document.createAttribute("class");
            classAtt.value = 'form-control';
            numberOfOptionsDropdown.setAttributeNode(classAtt);
    
        var descriptionOption = document.createElement("option");
                    descriptionOption.id = 'descriptionOption';
                    descriptionOption.value = 'x';
                    descriptionOption.innerHTML = 'Select number of options';
                numberOfOptionsDropdown.appendChild(descriptionOption);
        for (var i=1; i<5; i++) {
            var option = document.createElement("option");
                    option.id = 'option '+ (i+1);
                    option.value = i+1;
                    option.innerHTML = i+1;
                numberOfOptionsDropdown.appendChild(option);
            numberOfOptionsDiv.appendChild(numberOfOptionsDropdown);
        };
    return numberOfOptionsDiv;
};

/* Button Constructors */
function addDeleteButton() {
    var removeQuestion = $("<button></button>");
        removeQuestion.attr('id', 'removeQuestion')
                        .addClass(' btn btn-default')
                        .text('Remove question')
                        .on('click', function(){
                        $(this).parent().remove();
                        questionCount--;
                        return false;
                    });
    return removeQuestion;
};
                          
questionCount = -1;
$(document).ready(main);
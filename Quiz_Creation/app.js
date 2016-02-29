var main = function() {
    $("#addQuestionBtn").click(function addQuestion() {
        var input = document.createElement("input");
                input.type = "text";
                input.name = "tell";
        $( "#questions" ).append(input);
    });
};
                               

$(document).ready(main);
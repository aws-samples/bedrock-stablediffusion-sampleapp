const sample_prompts = new Map();

// Create a config object with sample prompts for users to choose
const prompts_config = {
   'Create my own': '',
   'Cool cats': 'Portrait of a Siamese cat',
   'Lets dance': 'Sculpture of a fun celebration',
   'Nature time': 'Oil painting of a cottage',
   'Sci-Fi': 'Portrait of a smiling cyborg woman',
   'Video game monsters': 'An ugly ogre',
   'Alien': 'An alien crossed with a raccoon',
   'Lets go Paris': 'A photorealistic render of the Eiffel Tower',
   'Ukiyo-e': 'Ukiyo-e print of two women'
};

// Iterate prompts_config and update the sample prompts map
for (const [key, value] of Object.entries(prompts_config)) {
	sample_prompts.set(key, value);
}

$(document).ready(function() {
  var socket = io(); // web socket to connect to the backend
  var base64_encoded_result_image = "";
  
  // on selection of a sample prompt, update the prompt input field
  $("#sample_prompt_list li a").click(function() {
	var selected_prompt = $(this).text();
	$("#prompt").val(sample_prompts.get(selected_prompt));
	$('#sample_button').text(selected_prompt);
  });

  $("#clear_button").click(function(){
  	$("#prompt").val("")
  })

  // on click of the run button, send the prompt to the backend via the web socket
  $("#run_button").click(function(){
	set_image_generation_in_progress(true);
	socket.emit("prompt",$("#prompt").val().trim());
  })

  // on contest submission, send the submissionto the backend via the web socket
  $("#uploadform").on("submit",function(event){
	event.preventDefault();
	set_file_upload_upload_in_progress(true);
	var upload_params = {
		'name': $("#submittername").val(), 
		'email': $("#submitteremail").val(),
		'company': $("#submittercompany").val(),
		'prompt': $("#prompt").val().trim(),
		'imagebase64': base64_encoded_result_image
	}
	socket.emit("uploadimage", upload_params);
  })
  
  // on receiving the Bedrock execution response message from the backend, update the UI
  socket.on("update",function(message){
	set_image_generation_in_progress(false);

  	if (message[0]=="bedrock_success") {
		base64_encoded_result_image=message[1];
		gen_imagebox.removeAttribute("hidden");
		genimage.setAttribute('src', "data:image/jpg;base64," + base64_encoded_result_image);
  	} else {
  		if (message[1].includes("(ThrottlingException)")) {
  			alert("Server is busy, please wait before trying again.")
  		} else {
			alert("Sorry, something went wrong. Please wait before trying again.")
	  	}
  	}
  })

  // on receiving submission result from the backend, update the UI
  socket.on("uploadresult",function(response){
	if (response['success']) {
		$("#uploadresult").text("Thank you, your entry has been submitted")
	} else {
		$("#uploadresult").text("Sorry, submission failed, please retry")
	}
	set_file_upload_upload_in_progress(false);
  })
})

function set_image_generation_in_progress(inProgress){
	$("#run_button_spinner").prop('hidden', !inProgress);
	$("#run_button_icon").prop('hidden', inProgress);
	$("#run_button").prop('disabled', inProgress);
	$("#prompt").prop('disabled', inProgress);
	$("#clear_button").prop('disabled', inProgress);
	if (inProgress) {
		$("#uploadresult").text("");
	}
}

function set_file_upload_upload_in_progress(inProgress) {
	$("#upload_button_spinner").prop('hidden', !inProgress);
	$("#upload_button_icon").prop('hidden', inProgress);
	$("#upload_button").prop('disabled', inProgress);
}

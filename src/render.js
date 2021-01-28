//import modules
const { desktopCapturer, remote } = require("electron");
const { writeFile } = require("fs"); //requires native nodejs fs module in order to enable file writing
const { dialog, Menu } = remote;

//Global states
//Media recorder instance to capture footage
let mediaRecorder;
//array to hold recorded chunks
const recordedChunks = [];

//IPC=inter-process communication
//assigns consts to html elements from document object
const videoElement = document.querySelector("video");

//startBtn
const startBtn = document.getElementById("startBtn");
//assigns click event handle to startBtn
startBtn.onclick = (e) => {
  //starts media recording with MediaRecorder start method
  mediaRecorder.start();
  //add element change to indicate it is currently recording
  startBtn.classList.add("is-danger");
  startBtn.innerText = "Recording";
};

//stopBtn
const stopBtn = document.getElementById("stopBtn");
//assigns click event handler to stopBtn
stopBtn.onclick = (e) => {
  //stops media recording with MediaRecorder stop method
  mediaRecorder.stop();
  //removes element change to indicate it is no longer recording
  startBtn.classList.remove("is-danger");
  startBtn.innerText = "Start";
};

//videoSelectBtn
const videoSelectBtn = document.getElementById("videoSelectBtn");
//shorthand for calling getVideoSources callback on click event on html element
videoSelectBtn.onclick = getVideoSources;

//asynchronous function
async function getVideoSources() {
  //promise to get sources using electron's native get source functions with options used as filters
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  ///buildFromTemplate is a native method that modifys the native object based on the array passed into it
  const videoOptionsMenu = Menu.buildFromTemplate(
    //Higher order map function to iterate through input sources and convert them into menu items
    inputSources.map((source) => {
      //returns an object and pushes it into the source array
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    })
  );
  console.log(inputSources);
  //popup method on Menu object creates a pop up of menu
  videoOptionsMenu.popup();
}

//Change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;

  //constraints option object
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };
  //Uses browser (Chromium's) built in navigator api to create a streaming video
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  //Previews the source in a video element (as defined in html)
  //Sets src object attribute to stream which is assigned in the line above
  //videoElement is the HTML tag which this object will be rendered
  videoElement.srcObject = stream;
  videoElement.play();

  //Create the Media Recorder
  //mime is an internet standard used to support attachment in text based email formats across the internet
  //webm is a video file type
  //vp9 is a video codec
  const options = { mimeType: "video/webm; codecs=vp9" };
  //new instance of media recorder passing in stream and options objects as arguments
  mediaRecorder = new MediaRecorder(stream, options);

  //Register Event Handlers
  //on the event data is available, use handleDataAvailable event handler
  mediaRecorder.ondataavailable = handleDataAvailable;
  //on the event on stop, use handleStop event handler
  mediaRecorder.onstop = handleStop;
  //Updates the UI
}

//Captures all recorded chunks
function handleDataAvailable(e) {
  console.log("video data available");
  //pushes event data chunks into array
  recordedChunks.push(e.data);
}

//Saves the video file on stop with an asynchronous promise
async function handleStop(e) {
  //a blob is a large collection of binary data, blob are a data structure to handle raw data
  const blob = new Blob(recordedChunks, {
    //passing in an object as second argument with options that tells what type of file the blob should be
    type: "video/webm; codecs=vp9",
  });

  //arrayBuffer method returns a promise with the content of the blob as primary data
  const buffer = Buffer.from(await blob.arrayBuffer());

  //Create a dialog box which asks you where you want to save the file
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defautlPath: `vid-${Date.now()}.webm`, //use string literal template to save file name with timestamp
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log("video successfully saved!"));
  }
}

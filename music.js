let audio =
document.getElementById(
"globalMusic"
);

if(audio){

const savedMusic =
localStorage.getItem(
"selectedMusic"
);

const savedTime =
localStorage.getItem(
"musicTime"
);

const musicEnabled =
localStorage.getItem(
"musicEnabled"
);

if(savedMusic){

audio.src =
savedMusic;

}

audio.addEventListener(
"loadedmetadata",
()=>{

if(savedTime){

audio.currentTime =
parseFloat(savedTime);

}

if(musicEnabled === "true"){

audio.play().catch(()=>{});

}

}
);


setInterval(()=>{

localStorage.setItem(
"musicTime",
audio.currentTime
);

},1000);

}

function toggleMusic(){

const audio =
document.getElementById(
"globalMusic"
);

if(audio.paused){

audio.play();

localStorage.setItem(
"musicEnabled",
"true"
);

}else{

audio.pause();

localStorage.setItem(
"musicEnabled",
"false"
);

}

}

async function uploadMusic(event){

const file =
event.target.files[0];

if(!file) return;

if(file.size > 10 * 1024 * 1024){

showToast(
"Max 10MB allowed ❌"
);

return;

}

try{

const formData =
new FormData();

formData.append(
"file",
file
);

formData.append(
"upload_preset",
"bujji_bajji_uploads"
);

const res =
await fetch(
"https://api.cloudinary.com/v1_1/dgsyc8r31/video/upload",
{
method:"POST",
body:formData
}
);

const data =
await res.json();

if(data.secure_url){

localStorage.setItem(
"selectedMusic",
data.secure_url
);

localStorage.setItem(
"musicEnabled",
"true"
);

const audio =
document.getElementById(
"globalMusic"
);

audio.src =
data.secure_url;

audio.play();

showToast(
"Music Updated 🎵"
);

}

}
catch(err){

console.log(err);

showToast(
"Upload Failed ❌"
);

}

}

function resetMusic(){

localStorage.removeItem(
"selectedMusic"
);

localStorage.removeItem(
"musicTime"
);

const audio =
document.getElementById(
"globalMusic"
);

audio.src =
"default-music.mp3";

audio.currentTime = 0;

audio.play();

localStorage.setItem(
"musicEnabled",
"true"
);

showToast(
"Default Music Restored 🎵"
);

}
function toggleMusicMenu(){

document
.getElementById("musicMenu")
.classList.toggle("hidden");

}
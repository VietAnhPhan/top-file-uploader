const dialogCreateFolder = document.querySelector(".dialog__create_folder");
const showButtonCreateFolder = document.querySelector(".btn__new_folder");

const dialogEditFolder = document.querySelector(".dialog__edit_folder");
const showButtonEditFolder = document.querySelector(".btn__edit_folder");

const showButtonUploadFiles = document.querySelectorAll(".btn__upload_files");
// const closeButton = document
//   .querySelectorAll(".dialog__create_folder")[0]
//   .querySelector("button");

showButtonCreateFolder.addEventListener("click", () => {
  dialogCreateFolder.showModal();
});

showButtonEditFolder.addEventListener("click", () => {
  dialogEditFolder.showModal();
});

showButtonUploadFiles.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.parentNode.querySelector(".dialog__upload_files").showModal();
  });
});

// closeButton.addEventListener("click", () => {
//   dialogCreateFolder.close();
// });

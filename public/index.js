const dialogCreateFolder = document.querySelector(".dialog__create_folder");
const showButtonCreateFolder = document.querySelector(".btn__new_folder");
const closeNewFolderBtn = document.querySelector(".btn__close_new_folder");

// const dialogEditFolder = document.querySelectorAll(".dialog__edit_folder");
const showButtonEditFolder = document.querySelectorAll(".btn__edit_folder");

const showButtonUploadFiles = document.querySelectorAll(".btn__upload_files");
const closeButton = document.querySelectorAll(".btn__close_dialog");

showButtonCreateFolder.addEventListener("click", () => {
  dialogCreateFolder.showModal();
});

closeNewFolderBtn.addEventListener("click", () => {
  dialogCreateFolder.close();
});

showButtonEditFolder.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.parentNode.querySelector(".dialog__edit_folder").showModal();
  });
});

showButtonUploadFiles.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.parentNode.querySelector(".dialog__upload_files").showModal();
  });
});

closeButton.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.parentNode.parentNode.parentNode.close();
  });
});

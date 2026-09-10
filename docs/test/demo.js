const toast = document.querySelector(".toast");
let timer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

document.querySelectorAll(".actions button").forEach((button) => {
  button.addEventListener("click", () => notify(`已选择：${button.dataset.action}`));
});

document.querySelectorAll(".tabs button").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".tabs .active")?.classList.remove("active");
    tab.classList.add("active");
    notify(`切换至「${tab.textContent.trim()}」`);
  });
});

document.querySelector(".close").addEventListener("click", () => notify("这是演示页，关闭按钮已触发"));

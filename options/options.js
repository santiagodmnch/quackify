function saveOptions(e) {
  e.preventDefault();
  let authToken = document.querySelector("#authToken").value.trim();
  
  // Ensure token has 'Bearer ' prefix if not present
  if (!authToken.startsWith('Bearer ')) {
    authToken = `Bearer ${authToken}`;
  }
  
  browser.storage.sync.set({
    authToken: authToken
  }).then(() => {
    const status = document.querySelector("#status");
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });
}

function restoreOptions() {
  browser.storage.sync.get("authToken").then((result) => {
    let token = result.authToken || "";
    // Remove 'Bearer ' prefix for display
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }
    document.querySelector("#authToken").value = token;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions); 
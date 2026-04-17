!function(){let e=document.documentElement,t=document.getElementById("themeToggle"),c="pctheme",a=localStorage.getItem(c)||(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");e.dataset.theme=a,t&&t.setAttribute("aria-checked","dark"===a),t&&t.addEventListener("click",()=>{var a;return a="dark"===e.dataset.theme?"light":"dark",void(e.dataset.theme=a,t&&t.setAttribute("aria-checked","dark"===a),localStorage.setItem(c,a))}),t&&t.addEventListener("keydown",e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),t.click())})}();const yearEl=document.getElementById("footerYear");yearEl&&(yearEl.textContent=new Date().getFullYear()),function(){let e=document.getElementById("cookieBanner"),t=document.getElementById("cbAccept"),c=document.getElementById("cbDecline"),a="pc_cookie_consent";!(!e||localStorage.getItem(a))&&(setTimeout(()=>e.classList.add("visible"),800),t&&t.addEventListener("click",()=>{localStorage.setItem(a,"accepted"),e.classList.remove("visible")}),c&&c.addEventListener("click",()=>{localStorage.setItem(a,"declined"),e.classList.remove("visible")}))}(),function(){
    let e = document.getElementById("contactForm");
    let t = document.getElementById("formSuccess");
    if(e) {
        e.addEventListener("submit", c => {
            c.preventDefault();
            let isValid = true;
            let inputs = e.querySelectorAll("[required]");
            
            inputs.forEach(input => {
                if(input.type !== "checkbox") {
                    input.style.borderColor = "";
                } else {
                    input.style.outline = "none";
                }
            });

            inputs.forEach(input => {
                let isEmpty = input.type !== "checkbox" ? !input.value.trim() : !input.checked;
                
                if (isEmpty) {
                    isValid = false;
                    if(input.type !== "checkbox") input.style.borderColor = "var(--rd)";
                    else input.style.outline = "1px solid var(--rd)";
                } else if (input.type === "email") {
                    let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(input.value.trim())) {
                        isValid = false;
                        input.style.borderColor = "var(--rd)";
                    }
                }
            });

            if (!isValid) {
                alert("Please fill out all required fields correctly. Ensure the email address is valid.");
            } else {
                e.style.display = "none";
                if(t) t.style.display = "block";
            }
        });
    }
}();
//# sourceMappingURL=terms.cb8d59c1.js.map

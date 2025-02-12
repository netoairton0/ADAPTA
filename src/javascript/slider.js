let slideIndex = 1;
showSlides(slideIndex);

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    console.log("hit", n)
    let i;
    let slides = document.getElementsByClassName("slide");
    let indicators = document.getElementsByClassName("indicator");
    if (n > slides.length) {slideIndex = 1}    
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    for (i = 0; i < indicators.length; i++) {
        indicators[i].className = indicators[i].className.replace(" active", "");
    }
    slides[slideIndex-1].style.display = "block";  
    indicators[slideIndex-1].className += " active";
}
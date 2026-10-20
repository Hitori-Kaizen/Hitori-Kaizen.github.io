document.addEventListener('DOMContentLoaded', function () { // espera a que cargue la pagina
  var track = document.querySelector('.slider-track'); // coge el contenedor de las imagenes
  var slides = document.querySelectorAll('.slide'); // coge todas las diapositivas
  var prevBtn = document.getElementById('slider-prev'); // coge el boton anterior
  var nextBtn = document.getElementById('slider-next'); // coge el boton siguiente
  var dotsContainer = document.querySelector('.slider-dots'); // coge el contenedor de los puntos

  if (!track || slides.length === 0) return; // si no hay slider, para aqui

  var currentIndex = 0; // indice de la diapositiva actual (empieza en 0)
  var totalSlides = slides.length; // numero total de diapositivas

  for (var i = 0; i < totalSlides; i++) { // recorre todas las diapositivas
    var dot = document.createElement('span'); // crea un punto
    dot.classList.add('dot'); // le pone la clase dot
    if (i === 0) dot.classList.add('active'); // el primer punto aparece activo
    dot.addEventListener('click', function () { // al hacer click en un punto
      var index = Array.from(dotsContainer.children).indexOf(this); // averigua que punto se clickeo
      goToSlide(index); // va a esa diapositiva
    });
    dotsContainer.appendChild(dot); // mete el punto en el contenedor
  }

  function goToSlide(index) { // funcion que mueve el slider a una diapositiva
    currentIndex = index; // actualiza el indice
    track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)'; // mueve el carrusel horizontalmente
    var dots = dotsContainer.querySelectorAll('.dot'); // coge todos los puntos
    dots.forEach(function (d) { d.classList.remove('active'); }); // quita active de todos
    dots[currentIndex].classList.add('active'); // pone active solo al punto actual
  }

  if (nextBtn) { // si existe el boton siguiente
    nextBtn.addEventListener('click', function () { // al hacer click
      var next = (currentIndex + 1) % totalSlides; // calcula la siguiente (si llega al final, vuelve al inicio)
      goToSlide(next); // va a la siguiente
    });
  }

  if (prevBtn) { // si existe el boton anterior
    prevBtn.addEventListener('click', function () { // al hacer click
      var prev = (currentIndex - 1 + totalSlides) % totalSlides; // calcula la anterior (evita numeros negativos)
      goToSlide(prev); // va a la anterior
    });
  }

  setInterval(function () { // cada 4 segundos avanza solo
    var next = (currentIndex + 1) % totalSlides; // calcula la siguiente
    goToSlide(next); // va a la siguiente
  }, 4000); // 4000 milisegundos = 4 segundos
}); // fin

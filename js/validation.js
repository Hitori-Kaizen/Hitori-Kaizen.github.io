document.addEventListener('DOMContentLoaded', function () { // espera a que cargue la pagina
  var form = document.getElementById('contact-form'); // coge el formulario
  if (!form) return; // si no existe, para aqui

  var summary = document.getElementById('validation-summary'); // coge el recuadro de errores
  var summaryList = document.getElementById('validation-list'); // coge la lista de errores

  var fields = { // guarda todos los campos del formulario
    nombre: { element: document.getElementById('nombre'), error: document.getElementById('error-nombre') },
    apellidos: { element: document.getElementById('apellidos'), error: document.getElementById('error-apellidos') },
    email: { element: document.getElementById('email'), error: document.getElementById('error-email') },
    password: { element: document.getElementById('password'), error: document.getElementById('error-password') },
    edad: { element: document.getElementById('edad'), error: document.getElementById('error-edad') },
    telefono: { element: document.getElementById('telefono'), error: document.getElementById('error-telefono') }
  };

  var radios = document.getElementsByName('genero'); // coge los radios de genero
  var checkboxes = document.getElementsByName('intereses'); // coge los checkboxes de intereses
  var pais = document.getElementById('pais'); // coge el select de pais

  function showError(field, message) { // funcion que muestra un error en un campo
    field.element.classList.add('error'); // pone el borde rojo en el input
    if (field.error) { // si tiene contenedor de error
      field.error.textContent = message; // escribe el mensaje
      field.error.style.display = 'block'; // lo hace visible
    }
    return message; // devuelve el mensaje
  }

  function clearError(field) { // funcion que quita el error de un campo
    field.element.classList.remove('error'); // quita el borde rojo
    if (field.error) { // si tiene contenedor de error
      field.error.textContent = ''; // vacia el mensaje
      field.error.style.display = 'none'; // lo oculta
    }
  }

  function clearAllErrors() { // funcion que limpia todos los errores
    Object.keys(fields).forEach(function (key) { // recorre cada campo
      clearError(fields[key]); // limpia el error de ese campo
    });
    if (summary) summary.style.display = 'none'; // oculta el resumen
    if (summaryList) summaryList.innerHTML = ''; // vacia la lista
  }

  function addSummaryError(msg) { // funcion que anade un error al resumen
    if (summary) summary.style.display = 'block'; // muestra el resumen
    if (summaryList) { // si existe la lista
      var li = document.createElement('li'); // crea un elemento de lista
      li.textContent = msg; // le pone el mensaje
      summaryList.appendChild(li); // lo mete en la lista
    }
  }

  function getSelectedRadio() { // funcion que coge el radio seleccionado
    for (var i = 0; i < radios.length; i++) { // recorre los radios
      if (radios[i].checked) return radios[i].value; // si esta marcado, devuelve su valor
    }
    return null; // si ninguno esta marcado, devuelve null
  }

  function getSelectedCheckboxes() { // funcion que coge los checkboxes marcados
    var selected = []; // array vacio
    for (var i = 0; i < checkboxes.length; i++) { // recorre los checkboxes
      if (checkboxes[i].checked) selected.push(checkboxes[i].value); // si esta marcado, lo guarda
    }
    return selected; // devuelve la lista
  }

  form.addEventListener('submit', function (e) { // al enviar el formulario
    e.preventDefault(); // evita que se envie de verdad
    clearAllErrors(); // limpia errores anteriores

    var errors = []; // lista de errores
    var nombre = fields.nombre.element.value.trim(); // coge el nombre sin espacios
    var apellidos = fields.apellidos.element.value.trim(); // coge los apellidos
    var email = fields.email.element.value.trim(); // coge el email
    var password = fields.password.element.value; // coge la contraseña
    var edad = fields.edad.element.value.trim(); // coge la edad
    var telefono = fields.telefono.element.value.trim(); // coge el telefono
    var selectedGender = getSelectedRadio(); // coge el genero marcado
    var selectedInterests = getSelectedCheckboxes(); // coge los intereses
    var selectedPais = pais ? pais.value : ''; // coge el pais

    if (nombre.length === 0) { // si el nombre esta vacio
      errors.push(showError(fields.nombre, 'Name is required'));
    } else if (nombre.length < 2) { // si tiene menos de 2 letras
      errors.push(showError(fields.nombre, 'Name must be at least 2 characters'));
    }

    if (apellidos.length === 0) { // si apellidos esta vacio
      errors.push(showError(fields.apellidos, 'Surname is required'));
    } else if (apellidos.length < 2) { // si tiene menos de 2 letras
      errors.push(showError(fields.apellidos, 'Surname must be at least 2 characters'));
    }

    var emailErrors = []; // errores del email
    if (email.length === 0) { // si esta vacio
      emailErrors.push('Email is required');
    } else {
      if (email.length < 6) emailErrors.push('Email must be at least 6 characters'); // muy corto
      if (email.indexOf('@') === -1) emailErrors.push('Email must contain @'); // no tiene @
      if (email.indexOf('.') === -1) emailErrors.push('Email must contain a dot'); // no tiene punto
      if (email.indexOf('@') === 0 || email.lastIndexOf('@') === email.length - 1) emailErrors.push('Email cannot start or end with @'); // @ al principio o final
      if (email.indexOf(' ') !== -1) emailErrors.push('Email cannot contain spaces'); // tiene espacios
    }
    var dotPos = email.lastIndexOf('.');
    var domainExt = dotPos !== -1 ? email.substring(dotPos) : '';
    if (domainExt !== '.com' && domainExt !== '.es' && domainExt !== '.org' && domainExt !== '.net') {
      emailErrors.push('Email must have a valid domain (.com, .es, etc.)');
    }

    if (emailErrors.length > 0) { // si hay errores del email
      showError(fields.email, emailErrors[0]); // muestra el primero
      emailErrors.forEach(function (msg) { errors.push(msg); }); // los guarda todos
    }

    var passErrors = []; // errores de la contraseña
    if (password.length === 0) { // si esta vacia
      passErrors.push('Password is required');
    } else {
      if (password.length < 6) passErrors.push('Password must be at least 6 characters'); // muy corta
      var hasLetter = false; // tiene letra?
      var hasNumber = false; // tiene numero?
      for (var i = 0; i < password.length; i++) { // recorre cada caracter
        var ch = password.charAt(i); // coge el caracter
        if (ch >= 'a' && ch <= 'z') hasLetter = true; // es minuscula?
        if (ch >= 'A' && ch <= 'Z') hasLetter = true; // es mayuscula?
        if (ch >= '0' && ch <= '9') hasNumber = true; // es numero?
      }
      if (!hasLetter) passErrors.push('Password must contain at least one letter'); // no tiene letras
      if (!hasNumber) passErrors.push('Password must contain at least one number'); // no tiene numeros
    }
    if (passErrors.length > 0) { // si hay errores de contraseña
      showError(fields.password, passErrors[0]); // muestra el primero
      passErrors.forEach(function (msg) { errors.push(msg); }); // los guarda todos
    }

    if (edad.length === 0) { // si edad esta vacia
      errors.push(showError(fields.edad, 'Age is required'));
    } else {
      var edadNum = Number(edad); // convierte a numero
      if (isNaN(edadNum)) { // si no es un numero
        errors.push(showError(fields.edad, 'Age must be a number'));
      } else if (edadNum < 18 || edadNum > 99) { // si es menor de 18 o mayor de 99
        errors.push(showError(fields.edad, 'Age must be between 18 and 99'));
      }
    }

    if (telefono.length === 0) { // si telefono esta vacio
      errors.push(showError(fields.telefono, 'Phone is required'));
    } else {
      var isOnlyDigits = true; // solo digitos?
      for (var i = 0; i < telefono.length; i++) { // recorre cada caracter
        if (telefono.charAt(i) < '0' || telefono.charAt(i) > '9') { // si no es digito
          isOnlyDigits = false; // marca que no es solo digitos
          break; // para de revisar
        }
      }
      if (!isOnlyDigits) { // si tiene letras o simbolos
        errors.push(showError(fields.telefono, 'Phone must contain only numbers'));
      } else if (telefono.length !== 9) { // si no tiene exactamente 9 digitos
        errors.push(showError(fields.telefono, 'Phone must be exactly 9 digits'));
      }
    }

    if (!selectedGender) { // si no selecciono genero
      errors.push('Please select a gender');
    }

    if (selectedInterests.length === 0) { // si no marco ningun interes
      errors.push('Please select at least one interest');
    }

    if (!selectedPais || selectedPais === '') { // si no selecciono pais
      errors.push('Please select a country');
    }

    if (errors.length > 0) { // si hay errores
      errors.forEach(function (msg) { addSummaryError(msg); }); // los muestra todos en el resumen
    } else { // si no hay errores
      alert('Form submitted successfully!'); // mensaje de exito
      form.reset(); // limpia el formulario
      clearAllErrors(); // limpia los errores
    }
  });
}); // fin

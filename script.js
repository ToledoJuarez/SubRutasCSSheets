document.addEventListener('DOMContentLoaded', () => {
    const agregarPosteBtn = document.getElementById('agregar-poste');
    const postesInputsDiv = document.getElementById('postes-inputs');
    const enviarDesperfectoBtn = document.getElementById('enviar-desperfecto');
    const tablaDetalleBody = document.querySelector('#tabla-detalle-desperfectos tbody');
    const tablaListaBody = document.querySelector('#tabla-lista-desperfectos tbody');
    const exportarCsvBtn = document.getElementById('exportar-csv');
    const desperfectoInput = document.getElementById('desperfecto');
    const detalleInput = document.getElementById('detalle');
	
	const nuInput = document.getElementById('nu');
	const tipoArbolInput = document.getElementById('tipoArbol');
	const faseInput = document.getElementById('fase');

    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxW1UbzWbFglHWB528vFadaUfChZzL3X1OfufbuyCTT-P0wkyyyh2ZgbV2692_YdLNCJw/exec';
    let subRutaCounter = 65; // ASCII para 'A'
    let desperfectoSeleccionado = null;
    let datosActuales = [];

    // Cargar datos al iniciar
    cargarDatos();

    agregarPosteBtn.addEventListener('click', () => {
        const nuevoInputGrupo = document.createElement('div');
        nuevoInputGrupo.classList.add('poste-input-group');
        nuevoInputGrupo.innerHTML = `
            <input type="text" class="poste" placeholder="Número de poste" required>
            <button type="button" class="eliminar-poste eliminar">Eliminar</button>
        `;
        postesInputsDiv.appendChild(nuevoInputGrupo);

        const botonEliminar = nuevoInputGrupo.querySelector('.eliminar-poste');
        botonEliminar.addEventListener('click', (event) => {
            event.target.parentNode.remove();
        });
    });

    enviarDesperfectoBtn.addEventListener('click', async () => {
        const desperfectoNombre = desperfectoInput.value.trim();
        const detalle = detalleInput.value.trim();
        const postesInputs = postesInputsDiv.querySelectorAll('.poste');
        const postes = Array.from(postesInputs).map(input => input.value.trim()).filter(value => value !== '');
        const fecha = formatearFecha(new Date());
		
		const nu = nuInput.value.trim();
		const tipoArbol = tipoArbolInput.value.trim();
		const fase = faseInput.value.trim();

        if (desperfectoNombre && detalle) {
            if (desperfectoSeleccionado) {
                // Modo edición - Enviamos todos los postes nuevos
                const subRuta = desperfectoSeleccionado.subruta;
                if (postes.length > 0) {
                    for (const poste of postes) {
                        await enviarDatosAGoogleSheets(subRuta, desperfectoNombre, detalle, poste, fecha, nu, tipoArbol, fase);
                    }
                } else {
					//alert('Por favor, ingrese el desperfecto y el detalle.');
                    await enviarDatosAGoogleSheets(subRuta, desperfectoNombre, detalle, 'N/A', fecha, nu, tipoArbol, fase);
                }
                desperfectoSeleccionado = null;
                enviarDesperfectoBtn.textContent = 'Guardar SubRuta';
            } else {
                // Modo nuevo - Enviamos todos los postes
                const subRuta = String.fromCharCode(subRutaCounter++);
                if (postes.length > 0) {
                    for (const poste of postes) {
                        await enviarDatosAGoogleSheets(subRuta, desperfectoNombre, detalle, poste, fecha, nu, tipoArbol, fase);
                    }
                } else {
                    await enviarDatosAGoogleSheets(subRuta, desperfectoNombre, detalle, 'N/A', fecha, nu, tipoArbol, fase);
                }
            }
            
            limpiarFormulario();
            await cargarDatos();
        } else {
            alert('Por favor, ingrese el desperfecto y el detalle.');
        }
    });

    exportarCsvBtn.addEventListener('click', () => {
        exportarACsv();
    });
//-----------------------------------------------------------------------edit------------------------------

    // ... (código anterior permanece igual hasta la función cargarDatos)

    async function cargarDatos() {
        try {
            const fechaHoy = formatearFecha(new Date());
            console.log(`Solicitando datos para fecha: ${fechaHoy}`);
            
            // Modificación importante: Usar await en el fetch y verificar la respuesta
            const response = await fetch(`${scriptUrl}?action=getData&fecha=${encodeURIComponent(fechaHoy)}`);
            
            console.log('Estado de la respuesta:', response.status);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const textResponse = await response.text();
            console.log('Respuesta en texto:', textResponse);
            
            let data;
            try {
                data = textResponse ? JSON.parse(textResponse) : [];
            } catch (e) {
                console.error('Error al parsear JSON:', e);
                throw new Error('Formato de respuesta inválido');
            }
            
            console.log('Datos recibidos:', data);
            
            if (!Array.isArray(data)) {
                console.error('La respuesta no es un array:', data);
                throw new Error('Formato de datos inválido');
            }
            
            datosActuales = data;
            
            actualizarTablaLista(data);
            actualizarTablaDetalle(data);
            
            // Actualizar contador de subrutas
            if (data.length > 0) {
                const ultimaSubRuta = data.reduce((max, item) => 
                    item.subruta > max ? item.subruta : max, 'A');
                subRutaCounter = ultimaSubRuta.charCodeAt(0) + 1;
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
            mostrarErrorEnTablas();
            // Mostrar error específico al usuario
            alert(`Error al cargar datos: ${error.message}. Verifique la consola para más detalles.`);
        }
    }

    // ... (resto del código permanece igual)
//-----------------------------------------------fin edit--------------------------------------------------

    function actualizarTablaLista(data) {
        console.log('Actualizando tabla lista con:', data);
        tablaListaBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const fila = tablaListaBody.insertRow();
            const celda = fila.insertCell();
            celda.colSpan = 4;
            celda.textContent = 'No hay datos disponibles';
            celda.style.textAlign = 'center';
            return;
        }
        
        // Agrupar por subruta
        const subRutasUnicas = {};
        data.forEach(item => {
            if (!subRutasUnicas[item.subruta]) {
                subRutasUnicas[item.subruta] = item;
            }
        });
        
        // Ordenar subrutas alfabéticamente
        const subRutasOrdenadas = Object.keys(subRutasUnicas).sort();
        
        subRutasOrdenadas.forEach(subRuta => {
            const item = subRutasUnicas[subRuta];
            const fila = tablaListaBody.insertRow();
            
            fila.insertCell().textContent = item.subruta || '';
            fila.insertCell().textContent = item.desperfecto || '';
            fila.insertCell().textContent = item.fecha || '';
			
			//fila.insertCell().textContent = item.nu || '';
			//fila.insertCell().textContent = item.tipoArbol || '';
			//fila.insertCell().textContent = item.fase || '';
            
            const celdaAccion = fila.insertCell();
            const botonEditar = document.createElement('button');
            botonEditar.textContent = 'Editar';
            botonEditar.className = 'btn-editar';
            botonEditar.addEventListener('click', () => prepararEdicion(item));
            celdaAccion.appendChild(botonEditar);
        });
    }

    function actualizarTablaDetalle(data) {
        console.log('Actualizando tabla detalle con:', data);
        tablaDetalleBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const fila = tablaDetalleBody.insertRow();
            const celda = fila.insertCell();
            celda.colSpan = 8;
            celda.textContent = 'No hay datos disponibles';
            celda.style.textAlign = 'center';
            return;
        }
        
        // Ordenar por subruta y luego por poste
        data.sort((a, b) => {
            if (a.subruta === b.subruta) {
                return (a.poste === 'N/A' ? '' : a.poste).localeCompare(b.poste === 'N/A' ? '' : b.poste);
            }
            return a.subruta.localeCompare(b.subruta);
        });

        data.forEach(item => {
            const fila = tablaDetalleBody.insertRow();
            fila.insertCell().textContent = item.subruta || '';
            fila.insertCell().textContent = item.desperfecto || '';
            fila.insertCell().textContent = item.detalle || '';
            fila.insertCell().textContent = item.poste || '';
            fila.insertCell().textContent = item.fecha || '';
			
			fila.insertCell().textContent = item.nu || '';
			fila.insertCell().textContent = item.tipoarbol || '';
			fila.insertCell().textContent = item.fase || '';
        });
    }

    function prepararEdicion(item) {
        console.log('Preparando edición para:', item);
        desperfectoInput.value = item.desperfecto || '';
        detalleInput.value = item.detalle || '';
		
		nuInput.value = item.nu || '';
		tipoArbolInput.value = item.tipoarbol || '';
		faseInput.value = item.fase || '';
		
        postesInputsDiv.innerHTML = '';
        
        // Agregar el poste actual si existe
        if (item.poste && item.poste !== 'N/A') {
            agregarCampoPoste(item.poste);
        }
        
        desperfectoSeleccionado = item;
        enviarDesperfectoBtn.textContent = 'Actualizar SubRuta';
    }

    function agregarCampoPoste(valor = '') {
        const nuevoInputGrupo = document.createElement('div');
        nuevoInputGrupo.classList.add('poste-input-group');
        nuevoInputGrupo.innerHTML = `
            <input type="text" class="poste" value="${valor}" placeholder="Número de poste">
            <button type="button" class="eliminar-poste eliminar">Eliminar</button>
        `;
        postesInputsDiv.appendChild(nuevoInputGrupo);

        const botonEliminar = nuevoInputGrupo.querySelector('.eliminar-poste');
        botonEliminar.addEventListener('click', (event) => {
            event.target.parentNode.remove();
        });
    }

    function limpiarFormulario() {
        desperfectoInput.value = '';
        detalleInput.value = '';
        postesInputsDiv.innerHTML = '';
		
		nuInput.value = '';
		tipoArbolInput.value = '';
		faseInput.value = '';
    }

    async function enviarDatosAGoogleSheets(subRuta, desperfecto, detalle, poste, fecha, nu, tipoArbol, fase) {
        try {
            const formData = new FormData();
            formData.append('subRuta', subRuta);
            formData.append('desperfecto', desperfecto);
            formData.append('detalle', detalle);
            formData.append('poste', poste);
            formData.append('fecha', fecha);
			
			formData.append('nu', nu);
			formData.append('tipoArbol', tipoArbol);
			formData.append('fase', fase);

            console.log('Enviando datos:', { subRuta, desperfecto, detalle, poste, fecha, nu, tipoArbol, fase});
            
            const response = await fetch(scriptUrl, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            
            console.log('Respuesta del servidor:', response);
        } catch (error) {
            console.error('Error al enviar datos:', error);
            throw error;
        }
    }

    function exportarACsv() {
        if (!datosActuales || datosActuales.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }

        const encabezados = ['SubRuta', 'Desperfecto', 'Detalle', 'Poste', 'Fecha', 'N/U', 'Tipo de Arbol', 'Fase'];
        const filas = [encabezados.join(',')];
        
        datosActuales.forEach(item => {
            const fila = [
                escapeCsv(item.subruta),
                escapeCsv(item.desperfecto),
                escapeCsv(item.detalle),
                escapeCsv(item.poste),
                escapeCsv(item.fecha),
				
				escapeCsv(item.nu),
				escapeCsv(item.tipoArbol),
				escapeCsv(item.Fase)
            ];
            filas.push(fila.join(','));
        });
        
        const csvContent = filas.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `desperfectos_${formatearFecha(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function escapeCsv(text) {
        if (!text) return '""';
        return `"${text.toString().replace(/"/g, '""')}"`;
    }

    function formatearFecha(fecha) {
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    function mostrarErrorEnTablas() {
        const mensajeError = 'Error al cargar datos. Recargue la página.';
        
        // Limpiar y mostrar error en tabla lista
        tablaListaBody.innerHTML = '';
        const filaLista = tablaListaBody.insertRow();
        const celdaLista = filaLista.insertCell();
        celdaLista.colSpan = 4;
        celdaLista.textContent = mensajeError;
        celdaLista.style.color = 'red';
        celdaLista.style.textAlign = 'center';
        
        // Limpiar y mostrar error en tabla detalle
        tablaDetalleBody.innerHTML = '';
        const filaDetalle = tablaDetalleBody.insertRow();
        const celdaDetalle = filaDetalle.insertCell();
        celdaDetalle.colSpan = 8;
        celdaDetalle.textContent = mensajeError;
        celdaDetalle.style.color = 'red';
        celdaDetalle.style.textAlign = 'center';
    }
});
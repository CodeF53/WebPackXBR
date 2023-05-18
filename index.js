import process_image from './process_image.js';

const packInput = document.getElementById("packInput");
packInput.addEventListener("submit", handleSubmit);

async function handleSubmit(event) {
  event.preventDefault();

  // get input values
  const file = event.target.querySelector("#pack").files[0];
  const scaleFactor = parseInt(event.target.querySelector("#scaleFactor").value);
  const isAuto = event.target.querySelector("#autoScale").checked;

  // Load the zip file with zip.js
  const zip = new JSZip();
  const zipFile = await zip.loadAsync(file);

  // Get all the png files in the zip
  const images = Object.values(zipFile.files).filter(file => file.name.endsWith('.png'));

  // Scale each png file
  let scaledImages;
  if (isAuto) {
    // #region create progressBar
    const progressBar = document.createElement('labeled-progressbar');
    progressBar.max = images.length;
    progressBar.value = 0;
    progressBar.name = 'progressBar';
    packInput.appendChild(progressBar);
    // #endregion

    // start scaling processing each image on asynchronous threads, waiting for all to complete
    scaledImages = await Promise.all(images.map(async pngFile => {
      const { name } = pngFile;

      // #region configure processing params based on image path
      let tile = { n: 'void', s: 'void', e: 'void', w: 'void' }
      let relayer = false;
      let skip = false;

      if (name.includes('block/')) {
        tile = { n: 'wrap', s: 'wrap', e: 'wrap', w: 'wrap' }
      } else if (name.includes('painting/')) {
        tile = { n: 'extend', s: 'extend', e: 'extend', w: 'extend' }
      } else if (name.includes('model/') || name.includes('entity/')) {
        relayer = true;
      } else if (name.includes('font/') || name.includes('colormap/')) {
        skip = true;
      }
      // #endregion

      // process the image
      const scaledCanvas = await process_image({ pngFile, scaleFactor, tile, relayer, skip });

      // convert the image to data that can be easily saved
      const data = scaledCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')

      // increment progressBar
      progressBar.value = parseInt(progressBar.value) + 1;

      return { name, data };
    }));

    // remove progressbar
    progressBar.remove()
  } else {
    // TODO: implement manual scaler
  }

  // add them to a new zip file
  const newZip = new JSZip();
  scaledImages.forEach(({ name, data }) => {
    newZip.file(name, data, { base64: true });
  });

  // Generate the zip file as a blob
  const zipBlob = await newZip.generateAsync({ type: 'blob' });

  // Save the zip file as the (input_filename)_xbr_(scaleFactor)x.zip
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(zipBlob);
  downloadLink.download = file.name.split(".").slice(0,-1).join(".")+`_xbr_${scaleFactor}x.zip`
  downloadLink.click();
}

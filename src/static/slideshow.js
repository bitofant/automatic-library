var slideshow = (function() {
  var libraryDetailsElem = null;
  var infoBarElem = null;
  var currentIndex = -1;
  var currentImg = null;
  var cachedLibData = null;
  var allCurrentImages = [];


  /**
   * @param {{ name: string, files: string[] }} libData
   */
  function initSlideshow(libData) {
    if (!libraryDetailsElem) {
      libraryDetailsElem = document.getElementById('library-details');
      infoBarElem = document.getElementById('info-bar');
    }
    unloadSlideshow();

    cachedLibData = libData;
    libraryDetailsElem.innerHTML = ''; // Clear previous details
    document.title = `${libData.name} - Automatic Library`;

    loadImage(`libs/${libData.name}/${libData.files[currentIndex = 0]}`, 0);
  }

  function loadImage(path, offset) {
    maybeUnloadCurrentImage(currentImg, offset);
    const img = document.createElement('img');
    currentImg = img;
    img.style.opacity = '0';
    img.style.transform = `translateX(${offset}px)`;
    img.className = 'slideshow-image';

    var longLoadTimeout = window.setTimeout(() => {
      status("Loading image, please wait...");
    }, 200);

    img.addEventListener('load', () => {
      window.clearTimeout(longLoadTimeout);
      if (img !== currentImg) return; // A newer image has been loaded in the meantime
      status(`${cachedLibData.name} - ${currentIndex + 1} / ${cachedLibData.files.length} - ${cachedLibData.files[currentIndex]}`);
      allCurrentImages.push(img);
      currentImg = img;
      resizeImage();
      libraryDetailsElem.appendChild(img);
      window.requestAnimationFrame(() => {
        img.style.opacity = '1';
        img.style.transform = 'translateX(0px)';
      });
    });
    img.src = path;
  }

  function maybeUnloadCurrentImage(img, offset) {
    if (!img) return;
    img.style.opacity = '0';
    img.style.transform = `translateX(${-offset}px)`;
    window.setTimeout(() => {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
      const index = allCurrentImages.indexOf(img);
      if (index !== -1) {
        allCurrentImages.splice(index, 1);
      }
    }, 500);
  }

  function resizeImage() {
    for (let img of allCurrentImages) {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      var winw = window.innerWidth;
      var winh = window.innerHeight;
      var scale = Math.min(winw / w, winh / h);
      img.style.width = Math.round(w * scale) + 'px';
      img.style.height = Math.round(h * scale) + 'px';
      img.style.left = Math.round((winw - w * scale) / 2) + 'px';
      img.style.top = Math.round((winh - h * scale) / 2) + 'px';
    }
  }

  function status(msg) {
    if (infoBarElem) {
      infoBarElem.innerText = msg;
    }
  }

  function unloadSlideshow() {
    libraryDetailsElem.innerHTML = '';
    currentImg = null;
    allCurrentImages = [];
    cachedLibData = null;
    currentIndex = 0;
    status('');
  }

  window.addEventListener('resize', resizeImage, false);

  var defaultOffset = Math.floor(window.innerWidth / 10);
  window.addEventListener('keydown', (ev) => {
    if (!libraryDetailsElem || !currentImg) return;
    var offset = 0;
    switch(ev.key) {
      case 'ArrowRight':
      case 'z':
        offset = defaultOffset;
        if (++currentIndex >= cachedLibData.files.length) {
          currentIndex = 0;
          offset = 5 * defaultOffset;
        }
        break;
      case 'ArrowLeft':
      case 'x':
        offset = -defaultOffset;
        if (--currentIndex < 0) {
          currentIndex = cachedLibData.files.length - 1;
          offset = -5 * defaultOffset;
        }
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        var rating = parseInt(ev.key);
        fetch(
          `/libs/${cachedLibData.name}/rate`,
          {
            "method": 'POST',
            "headers": {
              "Content-Type": 'application/json'
            },
            "body": JSON.stringify({
              img: cachedLibData.files[currentIndex],
              rating: rating
            })
          }).then(() => {
            log(`Rated image ${cachedLibData.files[currentIndex]} as ${rating}`);
          }).catch((err) => {
            log('Error rating image:', err);
          }
        );
        return;
      case 'Escape':
        unloadSlideshow();
        return;
      default:
        return;
    }
    loadImage(`libs/${cachedLibData.name}/${cachedLibData.files[currentIndex]}`, offset);
  });

  return {
    initSlideshow,
    unloadSlideshow
  };

}) ();

var DEBUG = true;
var VERSION_TAG = null;
ajax.get('/version-tag', function(versionTag) {
  VERSION_TAG = versionTag;
  if (versionTag === 'prod') {
    DEBUG = false;
  } else {
    longPollVersionTag();
  }
});
function longPollVersionTag() {
  try {
    var t0 = Date.now();
    ajax.get('/version-tag?longpoll=true', function(newVersionTag) {
      if (newVersionTag !== VERSION_TAG) {
        console.log("New version detected, reloading page.");
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      } else {
        setTimeout(longPollVersionTag, 10);
      }
    });
  } catch (e) {
    window.location.reload();
  }
}
const log = DEBUG ? console.log.bind(console) : function() {};

document.addEventListener("DOMContentLoaded", function() {
  log("Hello Automatic Library!");
  init();
});

var libraries = [];
var libaryListElem = null;

function init() {
  libaryListElem = document.getElementById('library-list');
  ajax.get("/libs", data => {
    libraries = JSON.parse(data);
    log("Loaded libraries:", libraries);
    let children = [
      elem({
        tag: 'li',
        innerText: 'Home',
        onclick: () => {
          log("Selected Home");
          const container = document.getElementById('library-details');
          container.innerHTML = '<h1>Welcome to Automatic Library</h1><p>Your automated library management system.</p>';
        }
      }),
      elem({
        tag: 'li',
        innerHTML: '&#9733;&#9733;&#9733;&#9733;&#9733;', // 5 stars
        onclick: () => {
          loadLibrary('5stars');
        }
      }),
      elem({
        tag: 'li',
        innerHTML: '&#9733;&#9733;&#9733;&#9733;&#9734;', // 4 stars
        onclick: () => {
          loadLibrary('4+stars');
        }
      }),
      elem({
        tag: 'li',
        innerHTML: '&#9733;&#9733;&#9733;&#9734;&#9734;', // 3 stars
        onclick: () => {
          loadLibrary('3+stars');
        }
      })
    ];

    for (let lib of libraries) {
      children.push(elem({
        tag: 'li',
        innerText: lib,
        onclick: () => {
          loadLibrary(lib);
        }
      }))
    }

    elem({
      tag: 'ul',
      children,
      appendTo: libaryListElem
    });
  });
  initLibraryListToggle();
}

function loadLibrary(lib) {
  ajax.get(`/libs/${lib}`, data => {
    const libData = JSON.parse(data);
    log("Loaded library data:", libData);
    displayLibrary(libData);
  });
}

function displayLibrary(libData) {
  slideshow.initSlideshow(libData);
}

var libListToggled = false;
function initLibraryListToggle() {
  libaryListElem.addEventListener('click', function(e) {
    if(e.target.tagName === 'DIV') {
      libListToggled = !libListToggled;
      if(libListToggled) {
        libaryListElem.style.width = libaryListElem.scrollWidth + 'px';
        libaryListElem.style.height = libaryListElem.scrollHeight + 'px';
        libaryListElem.className = 'lib-list-expanded';
      } else {
        libaryListElem.style.width = '40px';
        libaryListElem.style.height = '40px';
        libaryListElem.className = 'lib-list-collapsed';
      }
    }
  });
}

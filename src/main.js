const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
// F0 uses a plain canvas until the arena is implemented.
context.fillStyle = '#09171c';
context.fillRect(0, 0, canvas.width, canvas.height);
canvas.dataset.ready = 'true';

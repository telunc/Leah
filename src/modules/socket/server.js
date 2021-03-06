import socketio from 'socket.io';
import News from '../news';

let io = socketio();

io.on('connection', () => {
    console.log('Connected with socket');
});

setInterval(async function(){
    let news = await News.getNewsAdded();
    if (news.length) io.emit('news', news);
}, 300000);

io.listen(80);
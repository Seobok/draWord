const express = require('express')

function generateSerial() {     //방 시리얼 넘버 생성
    var chars = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        serialLength = 10,
        randomSerial = "",
        i,
        randomNumber;
    
    for (i = 0; i < serialLength; i = i + 1) {
        
        randomNumber = Math.floor(Math.random() * chars.length);
        
        randomSerial += chars.substring(randomNumber, randomNumber + 1);
        
    }

    return randomSerial;
}

function generateUserNickname(){    //무작위 닉네임 생성
    var adjective = ['번듯한', '멋진', '화려한', '우울한', '슬픈', '기쁜', '힘든', '포기하고 싶은', '조용한', '시끄러운', '재밌는', '노잼'],
    noun = ['호랑이', '사자', '인간', '쥐', '나무늘보', '너구리', '바위', '박명수', '토끼', '돼지', '아르마딜로', '사냥꾼', '마법사'],
    randomName="",
    randomNumber;

    randomNumber = Math.floor(Math.random() * adjective.length);
    randomName += adjective[randomNumber];
    randomName += " ";
    randomNumber = Math.floor(Math.random() * noun.length);
    randomName += noun[randomNumber];

    return randomName;
}

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
      origin: "http://localhost"
    }});

app.use(express.static('public'))       //서버생성시 public에 있는 index를 띄움

app.post('/createRoom', (request, response) => {        //createRoom form에서 호출 받으면 랜덤 roomId를 query형태로 넘김
    id = generateSerial()
    response.redirect('/room?roomId='+id)
})

app.listen(80, () => {});               //express 서버생성

server.listen(52273);                   //socket 서버 생성

var addNick = new Map();                //Nickname을 저장하는 배열 <roomId(int), NicknameArr(Array)>

io.on('connection', (socket) => {       //접속시
    const roomId = socket.handshake.query.roomId
    const userId = socket.id

    socket.join(roomId)

    io.to(userId).emit('userNick', addNickname = generateUserNickname())        //Nickname부여

    socket.nickname = addNickname;
    socket.roomMaster = Boolean(false);                                         //socket property : nickname, roomMaster(필요한가?)

    if(!addNick.has(roomId)) {                                                  //방이 존재하지 않는다면 (처음 들어왔다면)
        addNick.set(roomId, new Array());                                       //addNick Map에 roomId 추가
        socket.roomMaster = true;                                               //roomMaster 지정
    }
   
    addNick.get(roomId).push(socket.nickname)                                   //생성되어있는 방에 닉네임 추가

    io.to(roomId).emit('findRoomMaster', addNick.get(roomId)[0]);               //사람이 들어올때 마다 roomMaster에 대한 정보 제공

    socket.on('roomMemberList', (roomId) => {                                   //roomMemberList를 호출 시
        io.to(roomId).emit('userCount', io.of('/').adapter.rooms.get(roomId).size, addNick.get(roomId)) //userCount형태로 usercount와 nicknameArray를 제공 / 이후 분리가 필요해 보임
    })

    socket.on('gameStart', () => {                                              //방장이 게임시작 버튼을 누르면
        io.to(roomId).emit('setBrowser')                                        //브라우저 설정 이벤트 호출
    })

    socket.on('line', (data) => {
        //io.to(roomId).emit('line', data)
    })

    socket.on('disconnect', () => {                                             //접속이 종료될 때
        addNick.get(roomId).splice(addNick.get(roomId).indexOf(socket.nickname), 1)     //addNick Map에서 해당 유저 nickName 제거
        if(io.of('/').adapter.rooms.has(roomId)) {                                        //roomId가 존재하면 (남은 사람이 존재하여 방이 유지되면)
            io.to(roomId).emit('userCount', io.of('/').adapter.rooms.get(roomId).size, addNick.get(roomId));    //남은 usercount와 nicknameArray를 제공
            io.to(roomId).emit('findRoomMaster', addNick.get(roomId)[0]);                   //변경되었을 수 있기 때문에 roomMaster에 대한 정보 다시 제공
        }
        else {                                                                          //남은 사람이 존재하지 않는다면
            addNick.delete(roomId)                                                      //roomId 제거
        }
    })
})
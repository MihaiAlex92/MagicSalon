/// dev
MainController.$inject = ['$updateView'];
function MainController($updateView) {
	
	
	
  this.lattest_update = Date.now();
  this.STATUS_CONNECTING    = Client.CONNECTING;
  this.STATUS_CONNECTED     = Client.CONNECTED;
  this.STATUS_DISCONNECTED  = Client.DISCONNECTED;
  this.STATUS_DISCONNECTING = Client.DISCONNECTING;
  

  this.peers = {};

  this.getPeers = function() {
    return Object.keys(this.peers).map(function(name) {
      return this.peers[name]
    }.bind(this))
  }.bind(this);

  
  
  
  this.scrollToBottom = function() {
    var objDiv = document.getElementById("chat_window");
    objDiv.scrollTop = objDiv.scrollHeight;
  }

  this.presenceClient = new Client({
      subscribe: "tcp://localhost:10001"
    , request:   "tcp://localhost:10002"
    , push:      "tcp://localhost:10003"
  });
  this.presenceClient.onResponse = function(payload) {
    Object.merge(this.peers, JSON.parse(payload));
     var time_diff = Date.now()-this.lattest_update;
     if(time_diff >3500){   
    	 $updateView();
    	 this.lattest_update = Date.now();
     }
  }.bind(this);
  this.presenceClient.onPublish = function(payload) {
    var peer = JSON.parse(payload);
    this.peers[peer['name']] = this.peers[peer['name']] || {}
    Object.merge(this.peers[peer['name']], peer);
    var time_diff = Date.now()-this.lattest_update;
    if(time_diff >3500){   
    	$updateView();
   	 	this.lattest_update = Date.now();
    }
  }.bind(this);
  var interval;
  this.presenceClient.onConnect = function() {
    interval = setInterval(function() {
      this.presenceClient.push(JSON.stringify({
          name: this.name
        , online: true
        , text: this.text
        , timeout: 2
        , ocupat:false
      }));
    }.bind(this), 1000);
  }.bind(this);
  this.presenceClient.onDisconnect = function() {
    clearInterval(interval);
    this.peers = {};
  }.bind(this);

  this.messages = [];
  
  
  this.chatClient = new Client({
      subscribe: "tcp://localhost:10004"  // abonare
    , request:   "tcp://localhost:10005"   //connect online/offline
    , push:      "tcp://localhost:10006"  // trimitere date
  });
  this.chatClient.onResponse = function(payload) {
    JSON.parse(payload).forEach(function(msg) {
      this.messages.push(msg);
    }.bind(this));
    this.$root.$eval();
   // this.scrollToBottom();
  }.bind(this);
  
  //SUBMIT   PUB/SUB
  // Trimitere mesaj in chat sau trimitere de alert catre un operator dintr-o lista de selectie
  this.chatClient.onPublish = function(payload) {
    var msg = JSON.parse(payload);
    	
	
	
	
   if (msg["nrtel"]  && msg["readBy"] === this.name && this.ocupat == false){  //numele, nrtel  descriereTask
    	
	 
    	
    	this.nrtel = msg["nrtel"];
    	this.numele = msg["numele"];
    	this.descriereTask = msg["descriereTask"];
    	
    	
    	alert(msg["numele"]+"\n" +msg["nrtel"]+"\n"+msg["descriereTask"]) ;
    }
    else{
        //this.messages.push(msg);
        alert(msg["readBy"] + this.name);
        console.log(msg);

    }
    this.$root.$eval();
 //   this.scrollToBottom();

  }.bind(this);
  this.chatClient.onDisconnect = function() {
    this.messages = []
  }.bind(this);

  this.sendMessage = function() {
    if (this.message) {
      this.chatClient.push(JSON.stringify({
          name: this.name
        , text: this.message
        , text2: this.message2
      }));
      this.message = '';
      
     
      
    }
  }.bind(this)
  
  
  //functie de transmitere date catre un alt operator, ales dintr-o lista de selectie
  this.sendAlert = function() {
    if (this.numele) {
      this.chatClient.push(JSON.stringify({
          name: this.name
        , readBy: this.readBy
        //, message2: this.message2
        ,numele: this.numele
        ,nrtel: this.nrtel
        ,descriereTask: this.descriereTask
      }));
      this.message2 = '';

      
    }
  }.bind(this)

  this.connect = function() {
    this.presenceClient.connect();
    this.chatClient.connect();
    $updateView();
  }.bind(this);

  this.disconnect = function() {
    this.presenceClient.disconnect();
    this.chatClient.disconnect();
    $updateView();
  }.bind(this);
}




/*this.sendAlert = function() {
    if (this.numele) {
      this.chatClient.push(JSON.stringify({
          name: this.name
        , readBy: this.readBy
        //, message2: this.message2
        ,numele: this.numele
        ,nrtel: this.nrtel
        ,descriereTask: this.descriereTask
      }));
      this.message2 = '';

      
    }
  }.bind(this)*/
//////////////////////////////////////////////////////////
/*this.blockMe = function(){
	
	
	this.ocupat= true;
	
	else
		
		this.ocupat=false;
}*/

Client.CONNECTING = 2;
Client.CONNECTED = 0;
Client.DISCONNECTED = 1;
Client.DISCONNECTING = 3;

function Client(options) {
  this.status = Client.DISCONNECTED;
  this.options = options;

  this.onResponse = function(payload) {};
  this.onPublish = function(payload) {};
  this.onConnect = function() {};
  this.onDisconnect = function() {};
};

Client.prototype.connect = function() {
  if (this.status != Client.DISCONNECTED) {
    return;
  }

  this.context = new nullmq.Context('ws://'+window.location.hostname+':9000');
  this.status = Client.CONNECTING;

  this.startSub();
  this.doRequest();
  this.startPush();

  this.status = Client.CONNECTED;

  this.onConnect();
};

Client.prototype.disconnect = function() {
  if (this.status != Client.CONNECTED) {
    return;
  }

  this.status = Client.DISCONNECTING;

  this.stopSub();
  this.stopPush();
  this.context.term();
  delete this.context;

  this.status = Client.DISCONNECTED;

  this.onDisconnect();
};

Client.prototype.doRequest = function() {
  var req = this.context.socket(nullmq.REQ);
  req.connect(this.options['request']);
  req.send('');
  req.recv(this.onResponse);
}

Client.prototype.startSub = function() {
  this.subSock = this.context.socket(nullmq.SUB);

  this.subSock.connect(this.options['subscribe']);
  this.subSock.setsockopt(nullmq.SUBSCRIBE, '');

  this.subSock.recvall(this.onPublish);
}

Client.prototype.stopSub = function() {
  (this.subSock.close || angular.noop)();
}

Client.prototype.startPush = function() {
  this.pushSock = this.context.socket(nullmq.PUSH);
  this.pushSock.connect(this.options['push']);
}

Client.prototype.stopPush = function() {
  (this.pushSock.close || angular.noop)();
}

Client.prototype.push = function(payload) {
  if (this.status != Client.CONNECTED) {
    return;
  }
  this.pushSock.send(payload);
}

Object.merge = function(destination, source) {
    for (var property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property];
        }
    }
    return destination;
};

var log = require('./log.js');
var core = require('./core.js');
var stat = require('./stat.js');
var user = require('./user.js');
var team = require('./team.js');
var c = require('../config.js');

var msgmap = []; //list of message handle objects
var minmap = []; //list of minute tick objects

var tick = 0;

//Route message handlers
//Note: ONLY ONE function can be run per message. First gets priority.
function initMsgHandles(){
    msgh(/^![Ll]ockdown ( ?\d+ ?[HhMmSs])+$/, core.lockdown);
    msgh(/^(![Ss]tats [Hh][ae]lp)$/, stat.help);
    msgh(/^![Ss]tats [Aa]dd ((\w+)#(\d+))( M(\d+))?$/, stat.add);
    msgh(/^(![Hh]eroe?s)$/, stat.listHeroes);
    msgh(/^![Ss]tats [Gg]et ((\w+)#(\d+))(.*)$/, stat.get);
    msgh(/^![Hh]ero(e?s)? (.+)( M(\d+))?$/, stat.addHero);
    msgh(/^![Tt]eam [Cc]reate( (\w[^<>@#]{2,31})( (#[0-9a-fA-F]{6}))?(( (<@!?\d+>))+)?( T(\d+) V(\d+) R(\d+))?)?$/, team.newTeam);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Cc]olor (#[0-9a-fA-F]{6})/, team.setColor);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Mm]ember [Aa]dd (<@!?(\d+)>)/, team.addMember);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Mm]ember [Rr]emove (<@!?(\d+)>)/, team.removeMember);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Ss]ub [Aa]dd (<@!?(\d+)>)/, team.addSub);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Ss]ub [Rr]emove (<@!?(\d+)>)/, team.removeSub);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Cc]aptain (<@!?(\d+)>)/, team.setCaptain);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Nn]ame (\w[^<>@#]{2,31})/, team.setName);
    msgh(/^![Tt]eam [Ee]dit (\w[^<>@#]{2,31}) [Dd]elete/, team.remove);
    msgh(/^![Tt]eam [Gg]et (\w[^<>@#]{2,31})/, team.getTeam);
    msgh(/^![Cc]rash$/, core.crash);
    msgh(/^!m.*/, core.repeat);
//    msgh(/^!l.*/, stat.loadOld);
}
function initMinuteHandles(){
    minh(10, stat.refresh);
    minh(10, team.refresh);
    minh(60, stat.update, -5);
}

module.exports.ready = function(){
    log.info('READY');
    var roles = c.bot.guilds.get(c.guildId).roles.array();
    roles.forEach(role => {
        if(role.name == "@everyone"){
            c['everyone'] = role.id;
        }
    });
    initMsgHandles();
    initMinuteHandles();
    user.start();
    team.start();
    tickLoop(); //start the tick loop
    log.info('ready');
    stat.update();
    team.refresh();
};

module.exports.message = function(message){
    for(var i = 0; i < msgmap.length; i++){
        var mh = msgmap[i];
        var input = mh.regex.exec(message.content);
        if(input != null){
			log.info('message from ' + message.author.id + ', content: ' + message.content);
            try{
                mh.func(message, input);
                return;
            }catch(e){
				if(e == "Controlled Crash") throw e;
                log.error('MsgH FUNC ERROR: ' + mh.regex);
                log.error(e);
				log.error(e.stack == undefined ? 'no further information.' : e.stack);
            }
        }
    }
};

module.exports.guildMemberAdd = function(guildMember){
	log.info('event.js guildMemberAdd(' + guildMember.id + ')');
    core.guildMemberAdd(guildMember);
    user.newUser(guildMember);
};

module.exports.guildMemberRemove = function(guildMember){
	log.info('event.js guildMemberRemove(' + guildMember.id + ')');
    core.guildMemberRemove(guildMember);
};








function tickLoop(){
    setTimeout(() => {
        tick++;
        tickLoop();
        runTick();
    },60000);
}

function runTick(){
    minmap.forEach(function(mh) {
        if((tick - mh.offset) % mh.tick == 0){
            try{
                mh.func();
            }catch(e){
                log.error('MinH FUNC ERROR: ' + mh.regex);
                log.error(e);
		log.error(e.stack == undefined ? 'no further information.' : e.stack);
            }
        }
    });
}

function msgh(regex, func){
    var res = {
        "regex": regex,
        "func": func
    };
    msgmap.push(res);
}
function minh(tick, func, offset){
    if(offset == undefined) offset = 0;
    var res = {
        "tick": tick,
        "func": func,
        "offset": offset
    };
    minmap.push(res);
}

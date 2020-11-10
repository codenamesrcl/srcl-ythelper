const fs = require('fs'),
	  ytdl = require('ytdl-core'),
	  ytpl = require('ytpl'),
	  seriescall = require('./lib/seriesCall'),
	  _ = require('lodash'),
	  mergeav = require('./lib/av-merge'),
	  microlib = require('./lib/microlib');

const shouldDownloadVideo = true;

var outputfolder = './output',
	urls = `

`
	;

urls = urls.replace(/\t/g, '')
	.split(/\n/g)
	.filter((item)=>{
		return item.trim().length > 0;
	});

console.log(urls);

async function downloadAwait(url){
	if(url.length === 0){
		return;
	}

	var info;
	try{
		info = await ytdl.getBasicInfo(url);
	}
	catch(err){
		console.log('error getting ytdl Basic Info');
		throw err;
	}

	//console.log(info.player_response.videoDetails);
	var title = microlib.cleanupInvalidChars(info.player_response.videoDetails.title);


	console.log(title);
	console.log('dl start');
	try{
		await dlAudio(url, `${title}-audio.mp4`)
		if(shouldDownloadVideo){
			console.log('starting video dl');

			await dlVideo(url, `${title}-video.mp4`)
			console.log('dl completed');
			console.log("TODO: retool mergeav to do a video/audio split stream merge, right now mergeAV is disabled")
			return;
		}
		else{
			console.log('no video needed')
			return;
		}
	}
	catch(err){
		throw err;
	}
}

function sourcesExist(destbase){
	return audioExist(destbase) || 
		   videoExist(destbase) ||
		   fs.existsSync(`${destbase}.mp4`)
		   ;
}

function audioExist(destbase){
	return fs.existsSync(`${destbase}-audio.mp4`)
}

function videoExist(destbase){
	return fs.existsSync(`${destbase}-video.mp4`)
}

function fullExist(destbase){
	return fs.existsSync(`${destbase}-full.mp4`);
}

async function dlAudio(url, dest){
	var promise = new Promise(function(resolve, reject){
		if(fs.existsSync(`${outputfolder}/${dest}`)){
			console.log('audio file exists, auto-resolving');
			resolve();
		}
		else{
			var dl = ytdl(url, {
				quality: 'highestaudio',
				filter: (format) => format.container === 'mp4'
			});
			dl.on('progress', (chunksize, prog, total)=>{
				//prog and total are in bytes
		        var progmb = prog / 1000000;
		        var totalmb = total / 1000000;
		        microlib.singleLineLog(`${progmb} mb of ${totalmb} mb`);
			})
			var wstream = fs.createWriteStream(`${outputfolder}/${dest}`, {});
			dl.pipe(wstream);
			wstream.on('close', ()=>{
				console.log('\naudio complete')
				resolve();
			})
		}
	});
	
	return promise;
}

async function dlVideo(url, dest){
	var promise = new Promise(function(resolve, reject){
		if(fs.existsSync(`${outputfolder}/${dest}`)){
			console.log('video file exists, auto-resolving');
			resolve();
		}
		else{
			var dl = ytdl(url, {
				quality: 'highestvideo',
				//filter: (format) => format.container === 'mp4'
			});
			dl.on('progress', (chunksize, prog, total)=>{
				//prog and total are in bytes
		        var progmb = prog / 1000000;
		        var totalmb = total / 1000000;
		        microlib.singleLineLog(`${progmb} mb of ${totalmb} mb`);
			})
			dl.on('close', ()=>{

			});

			//after further testing especially with longer videos
			//we want to download the full video first because streaming into the encode
			//for a long video...is fucking annoying when a d/c happens and all progress is lost
			var wstream = fs.createWriteStream(`${outputfolder}/${dest}`, {});
			dl.pipe(wstream);
			wstream.on('close', ()=>{
				console.log('\nvideo complete')
				resolve();
			})
		}
	});
	
	return promise;
}

async function _processUrl(url){
	if(ytdl.validateURL(url)){
		return [url];
	}
	else{
		//is it a playlist
		if(ytpl.validateID(url)){
			try{
				var playlistID = await ytpl.getPlaylistID(url),
					playlist = await ytpl(playlistID, {limit: Infinity});

				return playlist.items.map((item)=>{
					return item.url_simple;
				});
			}
			catch(err){
				console.log('encountered ytpl error')
				console.error(err);
				return false;
			}
		}
	}
}

async function processUrls(urlList){
	//preprocess the url list in case there are playlists added to the mix
	//if so then breakdown the playlist urls into a list of youtube urls to concat to the to-process list
	//if the url is a valid video url though then don't run the playlist check as normal video urls can have playlists
	//attached to them depending on how the user got there
	var toprocess = [];
	var promises = [];
	urlList.forEach((item)=>{
		promises.push(_processUrl(item));
	})

	var items = await Promise.allSettled(promises);
  	console.log(items);
  	items.forEach((result)=>{	
  		if(result.status === 'fulfilled'){
  			toprocess = toprocess.concat(result.value);
  		}
  	})

  	return toprocess;
}

async function start(urlSource){

	var urlstoprocess = await processUrls(urlSource);

	//yt likes to rate limit, so concurrency of 1 is fine, we just want to chain the async series
	seriescall.runAsync(urlstoprocess, downloadAwait, 1, false)
		.then((done)=>{
			console.log('done');
		},
		(err)=>{
			console.error(err);
		});
}

start(urls).then(()=>{console.log('job done')});
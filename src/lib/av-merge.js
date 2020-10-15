const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath('../ffmpeg-static/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('../ffmpeg-static/bin/ffprobe.exe');

async function mergeAV(basedest, videostream){
	//ffmpeg -i video.mp4 -i audio.m4a -c:v copy -c:a copy output.mp4
	var encodeoptions = [
		//`-c:v libx265`,
		'-crf 26',
		'-preset slow'
	];
	
	console.log('merge encode start');
	var reportingMinutesInterval = 1,
		timemark = '',
		interval = null
		;

	//TODO:
	//include ffmpeg complex filters for concat via stream selection because sometimes the audio files have video attached
	//because of how youtube handles the audio option on older videos
	//so for the audio and video options, the specific parts have to be selected via the stream selection portion of complex filters
	ffmpeg()
		.input(`${basedest}-video.mp4`)
		.videoCodec('libx265')
		.input(`${basedest}-audio.mp4`)
		.audioCodec('copy')
		.outputOptions(encodeoptions)
		.on('start', function(commandLine){
			console.log('Spawned ffmpeg with command: ' + commandLine);

            interval = setInterval(function(){
                var date = new Date();
                console.log(date.toLocaleTimeString() + ` Timestamp:${timemark} completed`);
            }, 1000 * 60 * reportingMinutesInterval);
		})
		.on('error', (err)=>{
			console.error(err);
			clearInterval(interval);
			throw err;
		})
		.on('progress', function(progress) {
            timemark = progress.timemark;
            // console.log(progress)
            // console.log('Processing: ' + progress.percent + '% done');
        })
		.on('end', () => {
			console.log('merge encode done');
			clearInterval(interval);
			return true;
		})
		.save(`${basedest}-full.mp4`);
}

module.exports = {
	mergeAV: mergeAV
}
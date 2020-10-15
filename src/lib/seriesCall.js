module.exports = {
    run: run,
    runAsync: runAsync
};

var _ = require('lodash');

//run a a set of async calls synchrounously to avoid potentially massive memory costs
function run(list, call, concurrent, exitonreject){
    if(concurrent === null || concurrent === undefined || concurrent <= 0){
        concurrent = 1;
    }
    if(concurrent > list.length){
        concurrent = list.length;
    }

    var promise = new Promise(function(resolve,reject){
        var index = -1;

        var resultmap = [];
        var done = _.after(concurrent, function(){
            resolve(resultmap);
        });

        var caller = function(target){
            call(list[target])
                .then(
                    function(result){
                        resultmap[target] = result;
                        chainer();
                    },
                    function(err){
                        console.log(err);
                        if(exitonreject){
                            reject(err);
                        }
                        else{
                            chainer();
                        }
                    });
        };

        var chainer = function(){
            var target = ++index;
            if(list[target]){
                caller(target);
            }
            else{
                done(resultmap);
            }
        };

        //call chainer the amount of times to fill up the concurrent count
        for(startNum = 0; startNum < concurrent; startNum++){
            chainer();
        }

    });

    return promise;
}

//async/await version of the normal run call
async function runAsync(list, call, concurrent, exitonreject){
    if(concurrent === null || concurrent === undefined || concurrent <= 0){
        concurrent = 1;
    }
    if(concurrent > list.length){
        concurrent = list.length;
    }

    var index = -1;

    var resultmap = [];
    var done = _.after(concurrent, ()=>{
        return resultmap;
    });

    var caller = async (target)=>{
        try{
            resultmap[target] = await call(list[target]);;
            chainer();
        }
        catch(err){
            console.log(err);
            if(exitonreject){
                throw(err);
            }
            else{
                chainer();
            }
        }
    };

    var chainer = ()=>{
        var target = ++index;
        if(list[target]){
            caller(target);
        }
        else{
            done(resultmap);
        }
    };

    //call chainer the amount of times to fill up the concurrent count
    for(startNum = 0; startNum < concurrent; startNum++){
        chainer();
    }
}
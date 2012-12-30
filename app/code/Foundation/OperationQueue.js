/*

========================[   Operation   ]========================

OperationQueue mocking NSOperationQueue in iOS and OS X
From original logic of:
    https://github.com/AvocadoCorp/avocado-node-utils

OperationQueue:
            - abort
            - add
            - wait
            - waitCount
            

================================================================

*/

var     assert  = require('assert')
    ,   util    = require('util')
    ,   events  = require('events')
    ,   _       = require('underscore');


exports.OperationQueue = OperationQueue;

// OperationQueue inherits from EventEmitter
util.inherits(OperationQueue, events.EventEmitter);

function OperationQueue(opt_maxConcurrent, opt_initialFunctions, opt_context)
{
    if (opt_maxConcurrent)
        assert( _.isNumber(opt_maxConcurrent), 'expected number as 1st argument' );

    this._concurrent = 0;
    this._maxConcurrent = opt_maxConcurrent || null;
    this._backlog = [];

    this._context = opt_context || global;
    this._waiters = [];

    if (opt_initialFunctions) {
        this._addAll(opt_initialFunctions);
    }
    
    // super constructor
    events.EventEmitter.call(this);
}


OperationQueue.prototype._addAll =
    function(callbacks) {
        if (!callbacks || !callbacks.length) {
            return;
        }

        callbacks.forEach(this.add, this);
    };

OperationQueue.prototype.purge = 
    function(e)
    {
        this._backlog = [];

        // this.emit("purge", e);
    }

OperationQueue.prototype.abort = 
    function(e)
    {
        this._backlog = [];

        e.stacktrace = e.stack;

        this.emit("abort", e);
        
        if (this.debug  == true ||
            this.assert == true) {
            console.log('OperationQueue will abort, here\'s the error stack:');
            console.log( e.stack );
        }
    }


/**
* @return {boolean} Whether the given callback will be executed immediately
*     or will have to wait for others to finish first.
*/
OperationQueue.prototype.add = 
    function(callback) {
        if (this._maxConcurrent && this._concurrent == this._maxConcurrent) {
            this._backlog.push(callback);
            return false;
        }

        this._start(callback);
        return true;
    };


OperationQueue.prototype.waitCount = 
    function() {
        return this._backlog.length;
    };


OperationQueue.prototype._start = 
    function(callback) {
        this._concurrent++;
        var context = this._context;
        
        var doneWrapper = function(percentage) {
                this._finish(callback.name, percentage);
            };
        
        var boundFinish = doneWrapper.bind(this);

        var that = this;

        process.nextTick( 
            function()
            { 
                try 
                {
                    if (that.debug == true)
                        console.log('[ ' + callback.name + ' ] - Running');


                    callback.call(context, boundFinish);
                }
                catch(e) 
                {
                    that.abort(e);
                }
            });
    };


/** @private */
OperationQueue.prototype._finish = 
    function(title, percentage) // optional
    {
        this._concurrent--;
        
        // emit progress if given
        if (typeof title       == 'string' &&
        	typeof percentage == 'number') {
            this.emitProgress( title, percentage );
            
//            console.log( title + ': ' + percentage );
        }
        
        if (this._backlog.length)
        {
            this._start(this._backlog.shift());
        }
        else if (!this._concurrent)
        {
            var waiters = this._waiters.slice();
            this._waiters = [];

            waiters.forEach(
                function(waiter) {
                    waiter.call(this._context);
                }, this);
        }
    };


OperationQueue.prototype.wait = 
    function(callback)
    {
        if (!this._concurrent)
        {
            callback.call(this._context);
        } 
        else
        {
            this._waiters.push(callback);
        }
    };

OperationQueue.prototype._emitProgress =
    function(title, percentage)
    {
        // Lazy init
        var now = new Date();
        
        if (percentage <= 0) {
            if (!this.context)
                this.context = {};
            
            this.context.progress = {
                    startTime:  now
                ,   then:       now
                ,   step:       0
                };
            
//            console.log('this.context.progress init');
        }

        assert(this.context != undefined, 'queue.context has not been initialized, emitProgress(0) was not called');
        assert(this.context.progress != undefined, 'queue.context.progress has not been initialized, emitProgress(0) was not called');
        
        var progress = {
                step:       this.context.progress.step
            ,   delta:      (now - this.context.progress.then)
            ,   time:       (now - this.context.progress.startTime)
            ,   percentage: percentage
            };

        if (title)
            progress.title = title;
        
        this.emit('progress', progress);
        
        this.context.progress.step++;
    };

OperationQueue.prototype.emitProgress =
    function(arg0, arg1)
    {
        var title;
        var percentage;

        // Get proper arguments
        switch (arguments.length) {
            case 1:
                percentage = arg0;
                break;

            case 2:
                title = arg0;
                percentage = arg1;
                break;
                
            default:
                throw new Error('wrong arguments');
        }
        
        // Validate types
        if (title)
            assert(typeof title == 'string', 'title should be a string is: ' + typeof title);
        else if (percentage == 0)
            title = 'Zero';
        
        assert(typeof percentage == 'number', 'percentage should be a number: ' + typeof percentage);
        
        this._emitProgress(title, percentage);
    };


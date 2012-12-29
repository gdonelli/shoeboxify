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

    this.context_ = opt_context || global;
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
        var context = this.context_;
        var boundFinish = this._finish.bind(this);

        var that = this;

        process.nextTick( 
            function()
            { 
                try 
                {
                    if (that.debug == true)
                        console.log('[ ' + callback.name + ' ] - Running');

                    // console.log('boundFinish:');
                    // console.log(boundFinish);

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
    function() {
        this._concurrent--;

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
                    waiter.call(this.context_);
                }, this);
        }
    };


OperationQueue.prototype.wait = 
    function(callback)
    {
        if (!this._concurrent)
        {
            callback.call(this.context_);
        } 
        else
        {
            this._waiters.push(callback);
        }
    };


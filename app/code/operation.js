/*
 * lib source taken from
 *  https://github.com/AvocadoCorp/avocado-node-utils
 * munctional.js
 * I hated the name so changed it
 */


/**
 * @fileoverview Utilities for wrangling asynchronous nonsense by managing
 * lots of callbacks.
 */



/**
 * Executes a bunch of functions, potentially at the same time, and then once
 * they're all done, calls {callback}.
 *
 * @param {Array.<function(Function)>} functions An array of functions that
 *     take at leat one argument: A function to call when they are done doing
 *     their asynchronous business.
 * @param {Function} callback A callback to call once the list of {functions}
 *     have all finished.
 * @param {Object=} opt_context An optional context parameter to pass as {this}
 *     to the functions in {functions} and {callback}.
 */
function wait(functions, callback, opt_context) {
  var queue = new AsyncQueue(functions, opt_context);
  queue.wait(callback);
}
module.exports.wait = wait;


/**
 * Executes a bunch of functions, in order, passing along arguments to next()
 * to the next function.
 *
 * @param {Array.<function(function(Function, var_args))>} functions An array of
 *     functions that take at least a callback, as the first argument if others
 *     are passed along.
 * @param {Object=} opt_context An optional context parameter to pass as {this}
 *     to the functions in {functions}.
 */
function sequential(functions, opt_context) {
  var args = [];

  var callNext = function() {
    var next = functions.shift();
    if (!next) {
      return;
    }

    args = Array.prototype.slice.call(arguments);
    args.unshift(callNext);

    process.nextTick(function() {
      next.apply(opt_context, args);
    });
  };

  callNext(/* First call gets no additional arguments. */);
}
module.exports.sequential = sequential;


/**
 * Given a list of items that needs to be transformed into a list of other
 * items, but which transformation can only be done asynchronously, this
 * function attempts to transform everybody as quickly as possible while
 * maintaining the same order and, finally, calling {callback} with
 * the transformed list.
 *
 * @param {Array} array An array of items that needs to be transformed.
 * @param {function(Object, function(Object))} mapFunctionWithCallback The map
 *     function, which asynchronously transforms the item and calls the
 *     callback it was passed with the result.
 * @param {function(Array)} callback The callback that will be called with
 *     the resulting array of transformed items.
 */
function mapAsync(array, mapFunctionWithCallback, callback) {
  if (!array || array.length == 0) {
    // Ensure the callback is called.
    callback([]);
    return;
  }

  var total = array.length;
  var processed = 0;
  var out = [];

  array.forEach(function(rawItem, index) {
    mapFunctionWithCallback(rawItem, function(resultItem) {
      processed++;
      out[index] = resultItem;
      if (processed == total) {
        callback(out);
      }
    });
  });
}
module.exports.mapAsync = mapAsync;




/**
 * A class for managing a bunch of callbacks that might get added as time
 * goes forward, but where you want to know at the end whether they're all
 * complete.
 *
 * @constructor
 */
module.exports.queue = OperationQueue;


function OperationQueue(opt_initialFunctions, opt_context, opt_maxConcurrent) {
	this.concurrent_ = 0;
	this.maxConcurrent_ = opt_maxConcurrent || null;
	this.backlog_ = [];

	this.context_ = opt_context || global;
	this.waiters_ = [];
	if (opt_initialFunctions) {
		this.addAll(opt_initialFunctions);
	}
}

OperationQueue.prototype.addAll =
	function(callbacks) {
		if (!callbacks || !callbacks.length) {
			return;
		}

		callbacks.forEach(this.add, this);
	};


/**
* @return {boolean} Whether the given callback will be executed immediately
*     or will have to wait for others to finish first.
*/
OperationQueue.prototype.add = 
	function(callback) {
		if (this.maxConcurrent_ && this.concurrent_ == this.maxConcurrent_) {
			this.backlog_.push(callback);
			return false;
		}

		this.start_(callback);
		return true;
	};


OperationQueue.prototype.waitCount = 
	function() {
		return this.backlog_.length;
	};


OperationQueue.prototype.start_ = 
	function(callback) {
		this.concurrent_++;
		var context = this.context_;
		var boundFinish = this.finish_.bind(this);
		process.nextTick( function() { callback.call(context, boundFinish); });
	};


/** @private */
OperationQueue.prototype.finish_ = 
	function() {
		this.concurrent_--;

		if (this.backlog_.length)
		{
			this.start_(this.backlog_.shift());
		}
		else if (!this.concurrent_)
		{
			var waiters = this.waiters_.slice();
			this.waiters_ = [];

			waiters.forEach(
				function(waiter) {
					waiter.call(this.context_);
				}, this);
		}
	};


OperationQueue.prototype.wait = 
	function(callback)
	{
		if (!this.concurrent_)
		{
			callback.call(this.context_);
		} 
		else
		{
			this.waiters_.push(callback);
		}
	};


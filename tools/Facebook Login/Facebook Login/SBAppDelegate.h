//
//  SBAppDelegate.h
//  Facebook Login
//
//  Created by Giovanni Donelli on 11/13/12.
//  Copyright (c) 2012 Giovanni Donelli. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface SBAppDelegate : NSObject <NSApplicationDelegate>

@property (assign) IBOutlet NSWindow *window;
@property (weak) IBOutlet WebView *webView;

@end

//
//  SBAppDelegate.m
//  Facebook Login
//
//  Created by Giovanni Donelli on 11/13/12.
//  Copyright (c) 2012 Giovanni Donelli. All rights reserved.
//

#import "SBAppDelegate.h"

extern NSString* gUrlToLoad;

@implementation SBAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification
{
    // Insert code here to initialize your application
    
    [self.webView setCustomUserAgent: @"com.shoeboxify.test"];
    
    [self.webView setFrameLoadDelegate:self];
   
    WebFrame* mainFrame = [self.webView mainFrame];
    
    NSString* loginURLStr = @"http://local.shoeboxify.com:3000/facebook-login";
    
    NSURLRequest* urlQuest =[NSURLRequest requestWithURL:[NSURL URLWithString:loginURLStr]];
    
    [mainFrame loadRequest:urlQuest];
}


- (void)webView:(WebView *)sender didFinishLoadForFrame:(WebFrame *)frame
{
    NSString* src = [[[[self.webView mainFrame] dataSource] representation] documentSource];
    
    printf("%s", [src UTF8String]);
    
    fflush(stdout);
    
    exit(0);
}


@end

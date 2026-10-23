'use strict';
const {createWechatPlatform}=require('./platform');
const {createApp}=require('./app');
const canvas=wx.createCanvas();
createApp(createWechatPlatform(wx,canvas,{requestAnimationFrame,cancelAnimationFrame}));

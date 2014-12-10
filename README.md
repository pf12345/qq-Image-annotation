qq-Image-annotation
===================

qq Image annotation
<p></p>
<img src="qq.png" width="600" height="200" />

一个angular组件，用于如QQ截图后在图片上可以进行画笔绘画、文字输入、创建圆、方形；可以使用undo、redo操作，也可以导出操作后的图片；组件使用cavans实现，兼容性将为ie9及以上，并使用canvas框架kineticjs进行实现，使用较为简单实用。

安装使用：
由于是angular组件，所有需要添加相关模块，首先，添加相应的js及css文件，下载此所有文件后，如下添加至头部：
<pre>
    &ltlink rel="stylesheet" href="/stylesheets/reset.css"/&gt;
    &lt;link rel="stylesheet" href="/javascripts/review-paint/angular-paint.css"/&gt;
    &lt;script src="/javascripts/angular/angular.min.js"&gt;&lt;/script&gt;
    &lt;script src="/javascripts/angular/angular-all.js"&gt;&lt;/script&gt;
    &lt;script src="/javascripts/review/kinetic.min.5.0.1.js"&gt;&lt;/script&gt;
    &lt;script src="/javascripts/review-paint/angular-paint.js"&gt;&lt;/script&gt;
</pre>

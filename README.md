qq-Image-annotation
===================

qq Image annotation
<p></p>
<img src="qq.png" width="600" height="200" />

一个angular及jquery组件，用于如QQ截图后在图片上可以进行画笔绘画、文字输入、创建圆、方形、更换颜色；可以使用undo、redo操作，也可以导出操作后的图片；组件使用cavans实现，兼容性将为ie9及以上，并使用canvas框架kineticjs进行实现，且angular中没有使用juqery，使用纯js实现，使用较为简单实用。

##angular

<a target="_blank" href="http://pf12345.github.io/demo/qq-Image-annotation/angular/paintbrush.html">angular示例demo</a>

###安装使用：

由于是angular组件，所有需要添加相关模块，首先，添加相应的js及css文件，下载此所有文件后，如下添加至头部：
<pre>
    &lt;link rel="stylesheet" href="css/reset.css"/&gt;
    &lt;link rel="stylesheet" href="css/angular-paint.css"/&gt;
    &lt;script src="js/angular.min.js"&gt;&lt;/script&gt;
    &lt;script src="js/angular-sanitize.js"&gt;&lt;/script&gt;
    &lt;script src="js/kinetic.min.5.0.1.js"&gt;&lt;/script&gt;
    &lt;script src="js/angular-paint.js"&gt;&lt;/script&gt;
</pre>
上面是demo中文件地址，添加时，注意文件路径，且有一个图标图片文件，默认是在css上一目录，如果需要修改，可以直接在angular-paint.css上直接进行修改。

在angular中使用，在angular中添加非常简单，只需要添加相应模块即可如下：
<pre>
angular.module('reviewPaint', ["ngSanitize","angular-paint"]);
</pre>

添加html,在使用时，需要添加html元素进行展示，如下：
<pre>
&lt;div paint img-src="test.png"&gt;&lt;/div&gt;
</pre>
只需要添加如下元素即可，在子元素div中，有个paint属性及img-src，这两个是必须的，第一个是用于添加此组件指令，而img-src则用于传递需要操作的图片路径；

##jquery

<a target="_blank" href="http://pf12345.github.io/demo/qq-Image-annotation/jquery/test.html">jquery示例demo</a>

###安装使用：

首先，在页面头部添加需要的文件：
<pre>
&lt;link rel="stylesheet" href="css/reset.css"/&gt;
&lt;link rel="stylesheet" href="css/angular-paint.css"/&gt;
&lt;script src="js/jquery-1.7.2.min.js"&gt;&lt;/script&gt;
&lt;script src="js/kinetic.min.5.0.1.js"&gt;&lt;/script&gt;
&lt;script src="js/jquery-paint.js"&gt;&lt;/script&gt;
</pre>

上面是demo中文件地址，添加时，注意文件路径，且有一个图标图片文件，默认是与css在同一目录，如果需要修改，可以直接在angular-paint.css上直接进行修改。

在html的body中添加元素：
<pre>
&lt;div id="test"&gt;&lt;/div&gt;
</pre>

添加js代码：
<pre>
&lt;script&gt;
    $('#test').ImageAnnotation({
        imgSrc: 'test.png',
        defaultColor: "green",
        exportImg: true
    });
&lt;/script&gt;
</pre>
添加如上即可以使用。其中参数可以设置如下：

1. imgSrc: 添加的图片地址，为必须添加项，可以传入远程图片，也可本地图片，但更倾向于本地图片，即在同一域下，原因下面图片导出时，有详细原因；
2. defaultColor： 传入颜色值，为字符串；为设置初始的画笔、文字、圆、箭头等颜色值，但在运行里面也可进行更改；
3. exportImg： 传入true或false的布尔值，用于控制是否是连通原图一起导出，详细信息在下面导出会详细说明；
4. strokeWidth: 传入大于0的数字，用于控制画笔、圆、箭头、方形的边框宽度；

======================================================================================

添加成功后，即可看到相应的界面及操作，在操作右上角有“保存”按钮，用于导出操作图片，默认是只能导出操作的相关动作的图片，不包括原图，如下图：

<img src="nobackground.png" height="400"/>

如果需要一同导出原图，则需要有以下添加：

1. 将上面的angular中img-src的地址（jquery中传入参数imgSrc）与你的页面在同一域下，即不能跨域；
2. 运行需要搭建一个本地服务器上运行，即不能直接本地打开，即路径不能是：“file:///”开始；
3. angular在上面html代码需要修改如下（jquery则需要设置exportImg为true）：
<pre>

&lt;div paint img-src="test.png" exportImg &gt;&lt;/div&gt;

</pre>
如果有以上添加满足，则可以导出整体图片，导出结果如下：

<img src="all1.png" height="400"/>

<b>注：在点击“保存”时，实际是在浏览器打开操作图片，有些浏览器会阻止弹出窗口，请允许查看。</b>

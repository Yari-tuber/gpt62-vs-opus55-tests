"""Macro insert. Paint the cornea at shot resolution rather than enlarging a face."""
from illustrations import Cel,INK
from PIL import Image
import random,math

def paint():
    c=Cel(1200,675,1.7);r=random.Random(75)
    c.path('M 108 -10 L 1200 -10 L 1200 676 L 0 676 L 0 563 Q 83 453 116 382 Q 149 309 127 233 Q 101 152 108 -10 Z','#ecb394',INK,2)
    c.path('M 115 -8 L 1153 -8 L 860 236 Q 649 196 523 246 Q 391 227 284 264 Q 204 278 137 324 Q 140 254 120 213 Z','#d69985')
    c.path('M 137 256 Q 301 135 565 175 Q 399 166 259 208 Q 186 231 137 265 Z','#825f61')
    c.path('M 141 237 Q 282 103 545 147 Q 602 153 630 168 Q 465 153 350 171 Q 240 188 145 248 Z','#473d48')
    for k in range(35):
        x=154+k*7.4;y=229-(k*3.41)+.047*k*k
        c.line([(x,y),(x+11,y-9)],'#66515a',1.3)
    # The colored iris and every radial mark are masked by the drawn eye opening.
    shape='M 151 320 Q 265 242 383 247 Q 480 245 560 272 Q 437 386 287 390 Q 207 389 151 320 Z'
    c.path(shape,'#efd4bb','#806365',2)
    inside=Cel(1200,675,1.7)
    inside.oval(176,222,363,389,'#384a55')
    inside.oval(183,225,357,384,'#607478')
    inside.path('M 187 297 Q 201 350 253 365 Q 305 384 351 330 Q 329 382 283 386 Q 210 390 187 337 Z','#a89982')
    for i in range(150):
        theta=2*math.pi*i/150+r.uniform(-.018,.018)
        ra=r.uniform(43,73);rb=r.uniform(max(ra+2,69),84)
        co=r.choice(['#84908a','#566d74','#758486','#a19c89','#435d68'])
        p=lambda rad:(270+rad*1.03*math.cos(theta),303+rad*.92*math.sin(theta))
        inside.line([p(ra),p(rb)],co,r.uniform(.6,1.9))
    inside.oval(221,246,312,344,'#263f50')
    inside.path('M 149 305 Q 325 217 562 275 Q 452 257 361 279 Q 242 273 158 328 Z','#56636a')
    inside.oval(221,275,244,293,'#fbe0bb')
    inside.oval(247,268,256,275,'#f7e9cd')
    inside.oval(305,347,311,351,'#c5bd9e')
    mask=Cel(1200,675,1.7);mask.path(shape,'#ffffff')
    from PIL import ImageChops
    inside.im.putalpha(ImageChops.multiply(inside.im.getchannel('A'),mask.im.getchannel('A')))
    c.im.alpha_composite(inside.im)
    c.path('M 113 287 Q 142 309 165 304 Q 285 227 399 234 Q 492 235 571 269 L 560 276 Q 457 249 378 255 Q 265 251 163 323 Q 148 330 137 315 Z','#303342')
    c.path('M 151 315 Q 135 308 119 297 Q 129 314 148 323 Z','#323443')
    c.path('M 168 328 Q 202 383 276 389 Q 394 389 466 348',None,'#995f5b',2.9)
    c.path('M 196 371 Q 260 408 358 386',None,'#f6cfad',3)
    c.path('M 344 385 Q 397 377 444 351',None,'#ffe0b6',3.4)
    c.path('M 184 302 Q 310 228 454 247',None,'#68525a',1.8)
    for i in range(75):
        x=r.uniform(229,615);y=r.uniform(401,484)+14*math.sin(x*.013)
        c.line([(x,y),(x-3.3,y+r.uniform(3.5,9))],r.choice(['#da9d88','#e0a48c','#dfa48d']),1.1)
    c.path('M 0 0 L 681 0 Q 501 71 352 97 Q 201 128 83 216 Q 141 149 190 104 Q 104 138 26 204 Q 68 141 92 104 Q 41 123 0 160 Z','#293a4e',INK,2)
    c.path('M 0 45 Q 135 3 288 0 L 404 0 Q 204 35 41 115 Q 86 74 131 48 Z','#536274')
    c.path('M 1200 0 L 673 0 Q 682 137 546 322 Q 632 276 696 198 Q 680 325 590 431 Q 708 375 762 284 Q 744 417 804 560 Q 829 618 822 675 L 1200 675 Z','#29394c',INK,2)
    c.path('M 774 0 Q 764 183 641 353 Q 728 239 760 179 Q 783 114 789 0 Z','#42546a')
    c.path('M 883 0 Q 809 283 876 456 Q 914 534 905 674 L 954 675 Q 943 531 908 442 Q 824 252 930 0 Z','#3d5066')
    for i in range(11):
        x=685+7*i
        c.path(f'M {x} -8 Q {x-8} {114+6*i} {551+11*i} {300+i*7}',None,['#4a5a6c','#394d61','#576475'][i%3],1.25)
    c.path('M 609 0 Q 452 60 270 90',None,'#9c8b82',1.7)
    c.path('M 684 23 Q 674 163 578 291',None,'#a18679',1.3)
    c.save('eye')

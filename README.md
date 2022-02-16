### 项目介绍
在提审工作中，我们需要经常去查看邮件，去得知目前审核的最新状态。随着账号越来越多。我们的账号状态的跟进越来越麻烦。为了解决这个问题。所以诞生了此工具。

#### 工具使用
1. cd到工程目录，执行指令 ```npm install```
2. 安装完成后。执行指令```npm run start```


#### 配置说明
##### **config/emails.json** 需要用户配置。有以下配置项：
- sendReaded boolean 是否发送已读的邮件状态
- days number 只会读取days天以内的邮件
- cron string 定时器cron表达式。用于定时去查看。
- emails array 邮箱数组，里面放置邮箱的账号和密码。
	- email string 邮箱地址
	- pass string 邮箱密码
- sendTo string 将结果发送至邮箱
- sender object 设置发送邮箱
	- email string 邮箱地址
	- pass string 邮箱密码
- outputFolder string 输出邮箱内读取到的邮件状态。为空时不会输出。

##### **config/cfg.json** 邮箱的相关设置。此文件一般不需要配置。用于设置邮箱的 stmp、pop3、imap相关的信息

##### **config/apple.json** 苹果状态的相关配置。用于自定义识别苹果邮件的状态的配置。


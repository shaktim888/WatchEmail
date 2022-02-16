module.exports = [
    // 被拒绝
    {
        type : "rejected", 
        match : [
            ["^New Message from App Store Review Regarding (.*)", "name"],
            ["^Your App Review Feedback$"],
        ]
    },
    // 通过审核
    {
        type : "passed", 
        match : [
            ["^Welcome to the App Store$"],
            ['^The status of your \\(iOS\\) app, (.+), is now "Pending Developer Release"$', "name"],
        ],
    },
    // 状态改变
    {
        type : "statusUpdate", 
        match : [
            ['^The status of your \\(iOS\\) app, (.+), is now "(.+)"$', "name", "status"],
        ],
    },
    // 上传的包有问题
    {
        type : "ipaError", 
        match : [
            ['^App Store Connect: Your app "(.+)" \\(Apple ID: (.+) Version: (.+) Build: (.+)\\) has one or more issues$', "name" , "appid", "version", "build"],
        ],
    },
    // 上传的包完成审核
    {
        type : "completeProcess", 
        match : [
            ["^App Store Connect: Version (.+) \\((.+)\\) for (.+) has completed processing\\.$", "version", "build", "name"]
        ]
    }
]
import React from "react";
import "../styles/CharacterDetail.css";


const actions=[
    ["♡","宠幸"],
    ["◌","闲聊"],
    ["▣","赏赐"],
    ["♕","晋升"],
    ["⌂","搬迁"],
    ["!","问责"]
];


export default function CharacterDetail(){

return (

<div className="game">


    <div className="bg"/>


    {/* 顶部 */}
    <div className="header">

        <div className="palace">
            长春宫
            <span>
            西侧殿 · 人物档案
            </span>
        </div>

        <div className="close">
            ×
        </div>

    </div>



    {/* 人物区域 */}

    <div className="character">


        <img
        className="role"
        src="/assets/role.png"
        />


        {/* 姓名牌 */}

        <div className="name-card">

            <div className="name">
                程若兰
            </div>

            <div className="rank">
                贵人
            </div>


        </div>


    </div>



    {/* 档案卷轴 */}

    <div className="profile">


        <h2>
            人物小传 📖
        </h2>


        <p>
        江南程氏嫡女，温婉娴静，
        善琴棋书画，性情柔顺，
        颇得圣心。
        </p>


        <div className="line"/>


        <div className="info">


            <div>

            入宫时间：
            <br/>
            永和三年三月初七

            <br/><br/>

            年龄：
            18岁


            <br/><br/>

            位份：
            贵人


            <br/><br/>

            居所：
            长春宫西侧殿


            </div>



            <div>


            宠爱：

            ❤️❤️❤️❤️♡

            <br/><br/>


            容貌：
            <Bar value="92"/>


            才艺：
            <Bar value="78"/>


            心机：
            <Bar value="66"/>


            忠诚：
            <Bar value="85"/>



            </div>


        </div>


    </div>



    {/* 操作按钮 */}

    <div className="actions">


    {
        actions.map((a,i)=>(

            <div className="action"
            key={i}>


                <div className="jade">

                    {a[0]}

                </div>


                <div className="action-text">

                    {a[1]}

                </div>


            </div>


        ))
    }


    </div>



    {/* 底部tab */}

    <div className="tabs">

        <div className="active">
            属性
        </div>

        <div>
            履历
        </div>

        <div>
            关系
        </div>

        <div>
            赏赐记录
        </div>


    </div>



</div>

)

}



function Bar({value}){


return (

<div className="bar">

<div
style={{
width:value+"%"
}}
/>

</div>

)

}
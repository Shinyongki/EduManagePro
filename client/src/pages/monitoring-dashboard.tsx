import React, { useState, useMemo } from 'react';
import { Search, Phone, Mail } from 'lucide-react';
import {
  GWANGYEOK_MANAGER_MAPPING,
  SIGUNGU_MANAGER_INFO,
  GWANGYEOK_MANAGERS,
  SIGUNGU_LIST,
  getGwangyeokManager,
  getSigunguManager
} from '@/constants/managers';

const MonitoringDashboard = () => {
  const baseData = {
    '24년 시군구': [
      {id:"A48310001",name:"거제노인통합지원센터",city:"거제시",status:"미입력"},
      {id:"A48310002",name:"거제사랑노인복지센터",city:"거제시",status:"입력완료"},
      {id:"A48880002",name:"거창노인통합지원센터",city:"거창군",status:"입력완료"},
      {id:"A48880003",name:"거창인애노인통합지원센터",city:"거창군",status:"입력완료"},
      {id:"A48880004",name:"해월노인복지센터",city:"거창군",status:"입력완료"},
      {id:"A48820003",name:"대한노인회 고성군지회(노인맞춤돌봄서비스)",city:"고성군",status:"미입력"},
      {id:"A48820004",name:"한올생명의집",city:"고성군",status:"입력완료"},
      {id:"A48250007",name:"김해돌봄지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250004",name:"김해시종합사회복지관",city:"김해시",status:"점검완료"},
      {id:"A48250006",name:"보현행원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250005",name:"생명의전화노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250001",name:"효능원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48840001",name:"화방남해노인통합지원센터",city:"남해군",status:"점검완료"},
      {id:"A48840002",name:"화방재가복지센터",city:"남해군",status:"점검완료"},
      {id:"A48270002",name:"밀양노인통합지원센터",city:"밀양시",status:"입력완료"},
      {id:"A48270001",name:"밀양시자원봉사단체협의회",city:"밀양시",status:"미입력"},
      {id:"A48270003",name:"우리들노인통합지원센터",city:"밀양시",status:"입력완료"},
      {id:"A48240001",name:"사랑원노인지원센터",city:"사천시",status:"입력완료"},
      {id:"A48240002",name:"사천노인통합지원센터",city:"사천시",status:"입력완료"},
      {id:"A48860002",name:"산청복음노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48860004",name:"산청성모노인통합지원센터",city:"산청군",status:"입력중"},
      {id:"A48860001",name:"산청한일노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48860003",name:"산청해민노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48330001",name:"사회복지법인신생원양산재가노인복지센터",city:"양산시",status:"입력완료"},
      {id:"A48330005",name:"성요셉소규모노인종합센터",city:"양산시",status:"점검완료"},
      {id:"A48330004",name:"양산행복한돌봄 사회적협동조합",city:"양산시",status:"입력중"},
      {id:"A48720001",name:"의령노인통합지원센터",city:"의령군",status:"입력완료"},
      {id:"A48170004",name:"공덕의집노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170003",name:"나누리노인통합지원센터",city:"진주시",status:"입력완료"},
      {id:"A48170001",name:"진양노인통합지원센터",city:"진주시",status:"입력완료"},
      {id:"A48170002",name:"진주노인통합지원센터",city:"진주시",status:"입력완료"},
      {id:"A48170005",name:"하늘마음노인통합지원센터",city:"진주시",status:"입력완료"},
      {id:"A48740001",name:"사회적협동조합 창녕지역자활센터",city:"창녕군",status:"점검완료"},
      {id:"A48740002",name:"창녕군새누리노인종합센터",city:"창녕군",status:"점검완료"},
      {id:"A48120001",name:"동진노인통합지원센터",city:"창원시",status:"미입력"},
      {id:"A48120008",name:"경남노인통합지원센터",city:"창원시",status:"미입력"},
      {id:"A48120015",name:"마산회원노인종합복지관",city:"창원시",status:"입력완료"},
      {id:"A48120005",name:"마산희망지역자활센터",city:"창원시",status:"입력완료"},
      {id:"A48120004",name:"명진노인통합지원센터",city:"창원시",status:"입력중"},
      {id:"A48120011",name:"정현사회적협동조합",city:"창원시",status:"미입력"},
      {id:"A48120013",name:"진해노인종합복지관",city:"창원시",status:"입력완료"},
      {id:"A48120012",name:"진해서부노인종합복지관",city:"창원시",status:"점검완료"},
      {id:"A48120002",name:"창원도우누리노인통합재가센터",city:"창원시",status:"입력완료"},
      {id:"A48220003",name:"통영노인통합지원센터",city:"통영시",status:"입력중"},
      {id:"A48220002",name:"통영시종합사회복지관",city:"통영시",status:"입력완료"},
      {id:"A48850002",name:"경남하동지역자활센터",city:"하동군",status:"미입력"},
      {id:"A48850001",name:"하동노인통합지원센터",city:"하동군",status:"입력완료"},
      {id:"A48730001",name:"(사)대한노인회함안군지회",city:"함안군",status:"입력완료"},
      {id:"A48730002",name:"함안군재가노인통합지원센터",city:"함안군",status:"점검완료"},
      {id:"A48870002",name:"사단법인 대한노인회 함양군지회",city:"함양군",status:"입력완료"},
      {id:"A48890003",name:"미타재가복지센터",city:"합천군",status:"미입력"},
      {id:"A48890004",name:"합천노인통합지원센터",city:"합천군",status:"미입력"},
      {id:"A48890005",name:"코끼리행복복지센터",city:"합천군",status:"미입력"},
      {id:"A48890006",name:"사회적협동조합 합천지역자활센터",city:"합천군",status:"입력완료"}
    ],
    '24년 광역': [
      {id:"A48310001",name:"거제노인통합지원센터",city:"거제시",status:"미입력"},
      {id:"A48310002",name:"거제사랑노인복지센터",city:"거제시",status:"입력완료"},
      {id:"A48880002",name:"거창노인통합지원센터",city:"거창군",status:"점검완료"},
      {id:"A48880003",name:"거창인애노인통합지원센터",city:"거창군",status:"점검완료"},
      {id:"A48880004",name:"해월노인복지센터",city:"거창군",status:"점검완료"},
      {id:"A48820003",name:"대한노인회 고성군지회(노인맞춤돌봄서비스)",city:"고성군",status:"미입력"},
      {id:"A48820004",name:"한올생명의집",city:"고성군",status:"점검중"},
      {id:"A48250007",name:"김해돌봄지원센터",city:"김해시",status:"입력완료"},
      {id:"A48250004",name:"김해시종합사회복지관",city:"김해시",status:"입력완료"},
      {id:"A48250006",name:"보현행원노인통합지원센터",city:"김해시",status:"입력완료"},
      {id:"A48250005",name:"생명의전화노인통합지원센터",city:"김해시",status:"입력완료"},
      {id:"A48250001",name:"효능원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48840001",name:"화방남해노인통합지원센터",city:"남해군",status:"입력완료"},
      {id:"A48840002",name:"화방재가복지센터",city:"남해군",status:"점검완료"},
      {id:"A48270002",name:"밀양노인통합지원센터",city:"밀양시",status:"점검중"},
      {id:"A48270001",name:"밀양시자원봉사단체협의회",city:"밀양시",status:"미입력"},
      {id:"A48270003",name:"우리들노인통합지원센터",city:"밀양시",status:"입력완료"},
      {id:"A48240001",name:"사랑원노인지원센터",city:"사천시",status:"점검완료"},
      {id:"A48240002",name:"사천노인통합지원센터",city:"사천시",status:"점검완료"},
      {id:"A48860002",name:"산청복음노인통합지원센터",city:"산청군",status:"점검완료"},
      {id:"A48860004",name:"산청성모노인통합지원센터",city:"산청군",status:"점검완료"},
      {id:"A48860001",name:"산청한일노인통합지원센터",city:"산청군",status:"점검완료"},
      {id:"A48860003",name:"산청해민노인통합지원센터",city:"산청군",status:"점검완료"},
      {id:"A48330001",name:"사회복지법인신생원양산재가노인복지센터",city:"양산시",status:"점검중"},
      {id:"A48330005",name:"성요셉소규모노인종합센터",city:"양산시",status:"입력중"},
      {id:"A48330004",name:"양산행복한돌봄 사회적협동조합",city:"양산시",status:"입력중"},
      {id:"A48720001",name:"의령노인통합지원센터",city:"의령군",status:"점검중"},
      {id:"A48170004",name:"공덕의집노인통합지원센터",city:"진주시",status:"미입력"},
      {id:"A48170003",name:"나누리노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48170001",name:"진양노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48170002",name:"진주노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170005",name:"하늘마음노인통합지원센터",city:"진주시",status:"입력완료"},
      {id:"A48740001",name:"사회적협동조합 창녕지역자활센터",city:"창녕군",status:"입력완료"},
      {id:"A48740002",name:"창녕군새누리노인종합센터",city:"창녕군",status:"점검완료"},
      {id:"A48120001",name:"동진노인통합지원센터",city:"창원시",status:"입력완료"},
      {id:"A48120008",name:"경남노인통합지원센터",city:"창원시",status:"미입력"},
      {id:"A48120005",name:"마산희망지역자활센터",city:"창원시",status:"입력완료"},
      {id:"A48120004",name:"명진노인통합지원센터",city:"창원시",status:"점검중"},
      {id:"A48120011",name:"정현사회적협동조합",city:"창원시",status:"점검중"},
      {id:"A48120012",name:"진해서부노인종합복지관",city:"창원시",status:"점검완료"},
      {id:"A48120013",name:"진해노인종합복지관",city:"창원시",status:"점검중"},
      {id:"A48120002",name:"창원도우누리노인통합재가센터",city:"창원시",status:"입력완료"},
      {id:"A48220003",name:"통영노인통합지원센터",city:"통영시",status:"점검완료"},
      {id:"A48220002",name:"통영시종합사회복지관",city:"통영시",status:"점검완료"},
      {id:"A48850002",name:"경남하동지역자활센터",city:"하동군",status:"점검중"},
      {id:"A48850001",name:"하동노인통합지원센터",city:"하동군",status:"점검중"},
      {id:"A48730001",name:"(사)대한노인회함안군지회",city:"함안군",status:"점검중"},
      {id:"A48730002",name:"함안군재가노인통합지원센터",city:"함안군",status:"점검완료"},
      {id:"A48870002",name:"사단법인 대한노인회 함양군지회",city:"함양군",status:"점검중"},
      {id:"A48890003",name:"미타재가복지센터",city:"합천군",status:"미입력"},
      {id:"A48890004",name:"합천노인통합지원센터",city:"합천군",status:"미입력"},
      {id:"A48890005",name:"코끼리행복복지센터",city:"합천군",status:"점검중"},
      {id:"A48890006",name:"사회적협동조합 합천지역자활센터",city:"합천군",status:"점검중"}
    ],
    '25년 시군구': [
      {id:"A48310001",name:"거제노인통합지원센터",city:"거제시",status:"미입력"},
      {id:"A48310002",name:"거제사랑노인복지센터",city:"거제시",status:"입력완료"},
      {id:"A48880002",name:"거창노인통합지원센터",city:"거창군",status:"입력완료"},
      {id:"A48880003",name:"거창인애노인통합지원센터",city:"거창군",status:"입력완료"},
      {id:"A48880004",name:"해월노인복지센터",city:"거창군",status:"입력완료"},
      {id:"A48820003",name:"대한노인회 고성군지회(노인맞춤돌봄서비스)",city:"고성군",status:"입력완료"},
      {id:"A48820004",name:"한올생명의집",city:"고성군",status:"입력완료"},
      {id:"A48250007",name:"김해돌봄지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250004",name:"김해시종합사회복지관",city:"김해시",status:"점검완료"},
      {id:"A48250006",name:"보현행원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250005",name:"생명의전화노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48250001",name:"효능원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48840001",name:"화방남해노인통합지원센터",city:"남해군",status:"점검완료"},
      {id:"A48840002",name:"화방재가복지센터",city:"남해군",status:"점검완료"},
      {id:"A48270002",name:"밀양노인통합지원센터",city:"밀양시",status:"입력완료"},
      {id:"A48270001",name:"밀양시자원봉사단체협의회",city:"밀양시",status:"미입력"},
      {id:"A48270003",name:"우리들노인통합지원센터",city:"밀양시",status:"입력완료"},
      {id:"A48240001",name:"사랑원노인지원센터",city:"사천시",status:"입력완료"},
      {id:"A48240002",name:"사천노인통합지원센터",city:"사천시",status:"입력완료"},
      {id:"A48860002",name:"산청복음노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48860004",name:"산청성모노인통합지원센터",city:"산청군",status:"미입력"},
      {id:"A48860001",name:"산청한일노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48860003",name:"산청해민노인통합지원센터",city:"산청군",status:"입력완료"},
      {id:"A48330001",name:"사회복지법인신생원양산재가노인복지센터",city:"양산시",status:"점검완료"},
      {id:"A48330005",name:"성요셉소규모노인종합센터",city:"양산시",status:"점검완료"},
      {id:"A48330004",name:"양산행복한돌봄 사회적협동조합",city:"양산시",status:"점검완료"},
      {id:"A48720001",name:"의령노인통합지원센터",city:"의령군",status:"입력완료"},
      {id:"A48170004",name:"공덕의집노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170003",name:"나누리노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170001",name:"진양노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170002",name:"진주노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170005",name:"하늘마음노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48740001",name:"사회적협동조합 창녕지역자활센터",city:"창녕군",status:"점검완료"},
      {id:"A48740002",name:"창녕군새누리노인종합센터",city:"창녕군",status:"점검완료"},
      {id:"A48120014",name:"경남고용복지센터",city:"창원시",status:"미입력"},
      {id:"A48120008",name:"경남노인통합지원센터",city:"창원시",status:"미입력"},
      {id:"A48120001",name:"동진노인통합지원센터",city:"창원시",status:"미입력"},
      {id:"A48120015",name:"마산회원노인종합복지관",city:"창원시",status:"입력완료"},
      {id:"A48120005",name:"마산희망지역자활센터",city:"창원시",status:"입력완료"},
      {id:"A48120004",name:"명진노인통합지원센터",city:"창원시",status:"입력중"},
      {id:"A48120011",name:"정현사회적협동조합",city:"창원시",status:"미입력"},
      {id:"A48120013",name:"진해노인종합복지관",city:"창원시",status:"입력완료"},
      {id:"A48120012",name:"진해서부노인종합복지관",city:"창원시",status:"점검제출"},
      {id:"A48120002",name:"창원도우누리노인통합재가센터",city:"창원시",status:"입력완료"},
      {id:"A48220003",name:"통영노인통합지원센터",city:"통영시",status:"점검중"},
      {id:"A48220002",name:"통영시종합사회복지관",city:"통영시",status:"미입력"},
      {id:"A48850002",name:"경남하동지역자활센터",city:"하동군",status:"미입력"},
      {id:"A48850001",name:"하동노인통합지원센터",city:"하동군",status:"입력완료"},
      {id:"A48730001",name:"(사)대한노인회함안군지회",city:"함안군",status:"입력완료"},
      {id:"A48730002",name:"함안군재가노인통합지원센터",city:"함안군",status:"점검완료"},
      {id:"A48870002",name:"사단법인 대한노인회 함양군지회",city:"함양군",status:"입력완료"},
      {id:"A48890003",name:"미타재가복지센터",city:"합천군",status:"입력중"},
      {id:"A48890006",name:"사회적협동조합 합천지역자활센터",city:"합천군",status:"미입력"},
      {id:"A48890005",name:"코끼리행복복지센터",city:"합천군",status:"미입력"},
      {id:"A48890004",name:"합천노인통합지원센터",city:"합천군",status:"미입력"}
    ],
    '25년 광역': [
      {id:"A48310001",name:"거제노인통합지원센터",city:"거제시",status:"점검중"},
      {id:"A48310002",name:"거제사랑노인복지센터",city:"거제시",status:"점검중"},
      {id:"A48880002",name:"거창노인통합지원센터",city:"거창군",status:"점검중"},
      {id:"A48880003",name:"거창인애노인통합지원센터",city:"거창군",status:"점검중"},
      {id:"A48880004",name:"해월노인복지센터",city:"거창군",status:"점검중"},
      {id:"A48820003",name:"대한노인회 고성군지회(노인맞춤돌봄서비스)",city:"고성군",status:"점검중"},
      {id:"A48820004",name:"한올생명의집",city:"고성군",status:"점검중"},
      {id:"A48250007",name:"김해돌봄지원센터",city:"김해시",status:"점검중"},
      {id:"A48250004",name:"김해시종합사회복지관",city:"김해시",status:"점검중"},
      {id:"A48250006",name:"보현행원노인통합지원센터",city:"김해시",status:"입력완료"},
      {id:"A48250005",name:"생명의전화노인통합지원센터",city:"김해시",status:"점검중"},
      {id:"A48250001",name:"효능원노인통합지원센터",city:"김해시",status:"점검완료"},
      {id:"A48840001",name:"화방남해노인통합지원센터",city:"남해군",status:"점검중"},
      {id:"A48840002",name:"화방재가복지센터",city:"남해군",status:"점검중"},
      {id:"A48270002",name:"밀양노인통합지원센터",city:"밀양시",status:"점검중"},
      {id:"A48270001",name:"밀양시자원봉사단체협의회",city:"밀양시",status:"점검중"},
      {id:"A48270003",name:"우리들노인통합지원센터",city:"밀양시",status:"점검중"},
      {id:"A48240001",name:"사랑원노인지원센터",city:"사천시",status:"점검중"},
      {id:"A48240002",name:"사천노인통합지원센터",city:"사천시",status:"점검중"},
      {id:"A48860002",name:"산청복음노인통합지원센터",city:"산청군",status:"점검중"},
      {id:"A48860004",name:"산청성모노인통합지원센터",city:"산청군",status:"점검중"},
      {id:"A48860001",name:"산청한일노인통합지원센터",city:"산청군",status:"점검중"},
      {id:"A48860003",name:"산청해민노인통합지원센터",city:"산청군",status:"점검중"},
      {id:"A48330001",name:"사회복지법인신생원양산재가노인복지센터",city:"양산시",status:"점검중"},
      {id:"A48330005",name:"성요셉소규모노인종합센터",city:"양산시",status:"점검중"},
      {id:"A48330004",name:"양산행복한돌봄 사회적협동조합",city:"양산시",status:"점검중"},
      {id:"A48720001",name:"의령노인통합지원센터",city:"의령군",status:"점검중"},
      {id:"A48170004",name:"공덕의집노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48170003",name:"나누리노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48170001",name:"진양노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48170002",name:"진주노인통합지원센터",city:"진주시",status:"점검완료"},
      {id:"A48170005",name:"하늘마음노인통합지원센터",city:"진주시",status:"점검중"},
      {id:"A48740001",name:"사회적협동조합 창녕지역자활센터",city:"창녕군",status:"점검중"},
      {id:"A48740002",name:"창녕군새누리노인종합센터",city:"창녕군",status:"점검완료"},
      {id:"A48120014",name:"경남고용복지센터",city:"창원시",status:"점검중"},
      {id:"A48120008",name:"경남노인통합지원센터",city:"창원시",status:"점검중"},
      {id:"A48120001",name:"동진노인통합지원센터",city:"창원시",status:"점검중"},
      {id:"A48120015",name:"마산회원노인종합복지관",city:"창원시",status:"점검중"},
      {id:"A48120005",name:"마산희망지역자활센터",city:"창원시",status:"점검중"},
      {id:"A48120004",name:"명진노인통합지원센터",city:"창원시",status:"점검중"},
      {id:"A48120011",name:"정현사회적협동조합",city:"창원시",status:"입력완료"},
      {id:"A48120013",name:"진해노인종합복지관",city:"창원시",status:"점검중"},
      {id:"A48120012",name:"진해서부노인종합복지관",city:"창원시",status:"점검완료"},
      {id:"A48120002",name:"창원도우누리노인통합재가센터",city:"창원시",status:"점검중"},
      {id:"A48220003",name:"통영노인통합지원센터",city:"통영시",status:"점검중"},
      {id:"A48220002",name:"통영시종합사회복지관",city:"통영시",status:"점검중"},
      {id:"A48850002",name:"경남하동지역자활센터",city:"하동군",status:"점검중"},
      {id:"A48850001",name:"하동노인통합지원센터",city:"하동군",status:"점검중"},
      {id:"A48730001",name:"(사)대한노인회함안군지회",city:"함안군",status:"점검중"},
      {id:"A48730002",name:"함안군재가노인통합지원센터",city:"함안군",status:"점검완료"},
      {id:"A48870002",name:"사단법인 대한노인회 함양군지회",city:"함양군",status:"점검중"},
      {id:"A48890003",name:"미타재가복지센터",city:"합천군",status:"점검중"},
      {id:"A48890006",name:"사회적협동조합 합천지역자활센터",city:"합천군",status:"점검중"},
      {id:"A48890005",name:"코끼리행복복지센터",city:"합천군",status:"점검중"},
      {id:"A48890004",name:"합천노인통합지원센터",city:"합천군",status:"점검중"}
    ]
  };

  const [activeTab, setActiveTab] = useState('25년 시군구');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [managerFilter, setManagerFilter] = useState('전체');

  const statusColors = {
    '점검완료': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '입력완료': 'bg-blue-50 text-blue-700 border-blue-200',
    '점검제출': 'bg-purple-50 text-purple-700 border-purple-200',
    '입력중': 'bg-amber-50 text-amber-700 border-amber-200',
    '점검중': 'bg-orange-50 text-orange-700 border-orange-200',
    '미입력': 'bg-gray-50 text-gray-700 border-gray-200'
  };

  const isGwangyeok = activeTab.includes('광역');
  const currentData = baseData[activeTab as keyof typeof baseData];

  const cities = ['전체', ...new Set(currentData.map(d => d.city))].sort();
  const statuses = ['전체', '점검완료', '입력완료', '점검제출', '입력중', '점검중', '미입력'];

  const managers = useMemo(() => {
    if (isGwangyeok) {
      return ['전체', ...GWANGYEOK_MANAGERS];
    } else {
      return ['전체', ...SIGUNGU_LIST];
    }
  }, [isGwangyeok]);

  const filtered = useMemo(() => {
    return currentData.filter(item => {
      const matchSearch = item.name.includes(search) || item.id.includes(search);
      const matchCity = cityFilter === '전체' || item.city === cityFilter;
      const matchStatus = statusFilter === '전체' || item.status === statusFilter;

      let matchManager = true;
      if (managerFilter !== '전체') {
        if (isGwangyeok) {
          matchManager = getGwangyeokManager(item.id) === managerFilter;
        } else {
          matchManager = item.city === managerFilter;
        }
      }

      return matchSearch && matchCity && matchStatus && matchManager;
    });
  }, [currentData, search, cityFilter, statusFilter, managerFilter, isGwangyeok]);

  const stats = useMemo(() => {
    return statuses.slice(1).map(s => ({
      status: s,
      count: currentData.filter(d => d.status === s).length
    }));
  }, [currentData]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">상시관리·점검 모니터링 통합 현황</h1>
          <p className="text-gray-600">경상남도 수행기관별 진행 상태 및 담당자 정보</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Object.keys(baseData).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearch('');
                setCityFilter('전체');
                setStatusFilter('전체');
                setManagerFilter('전체');
              }}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {stats.map(({ status, count }) => (
            <div key={status} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">{status}</div>
              <div className="text-xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">{((count / currentData.length) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="기관명 또는 ID 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cities.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {managers.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {filtered.length}개 기관 표시 중 / 전체 {currentData.length}개
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">시군구</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">수행기관명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">수행기관 ID</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">통합상태</th>
                  {isGwangyeok ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">광역담당자</th>
                  ) : (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">시군구담당자</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const 시군구담당 = getSigunguManager(item.city);
                  const 광역담당 = getGwangyeokManager(item.id);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.id}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${statusColors[item.status as keyof typeof statusColors]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isGwangyeok ? (
                          <div className="text-sm font-medium text-gray-900">{광역담당 || '-'}</div>
                        ) : 시군구담당 ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{시군구담당.이름}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                              <Phone className="w-3 h-3" />
                              <span>{시군구담당.전화}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{시군구담당.이메일}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">안내사항</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <p>• 통합진행상태: 각 수행기관의 모든 지표가 동일한 상태일 경우 해당 상태로 표시, 혼재된 경우 "점검중"으로 표시</p>
            <p>• 시군구: 3개 지표 기준 / 광역: 12개 지표 기준</p>
            <p>• 광역지원기관: 이정혜(13개), 이연숙(7개), 김수연(12개), 신용기(23개) 담당</p>
            <p>• 시군구: 각 시군구별 담당 공무원 배정</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;

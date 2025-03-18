# بيّن API - توثيق واجهة برمجة التطبيقات

> **⚠️ تنبيه: هذه الخدمة تجريبية وفي طور التطوير المستمر**
>
> الخدمة الخلفية (Backend) حالياً في مرحلة تجريبية وتخضع للتطوير والتحسين. قد تتغير بعض الوظائف أو الواجهات البرمجية مستقبلاً مع تطور المشروع إلى نسخة أكثر تقدماً.

## نظرة عامة

هذه الوثيقة تشرح كيفية استخدام واجهة برمجة التطبيقات (API) للمساعد القانوني "بيّن" المتخصص في القوانين والأنظمة السعودية. تتيح هذه الخدمة للمطورين دمج المساعد القانوني في تطبيقاتهم من خلال واجهة برمجية بسيطة.

**الرابط الأساسي للخدمة:** `https://bayen.onrender.com`

## النقاط النهائية (Endpoints)

### 1. نقطة المحادثة - `/chat`

تُستخدم لإرسال رسائل المستخدم والحصول على ردود من المساعد القانوني.

- **الطريقة**: POST
- **نوع المحتوى**: application/json
- **الاستجابة**: نص متدفق (text/plain stream)

#### هيكل الطلب

```json
{
  "messages": [
    {
      "role": "user",
      "content": "نص سؤال المستخدم"
    },
    {
      "role": "assistant",
      "content": "نص رد المساعد السابق (إن وجد)"
    }
  ]
}
```

**ملاحظات**:
- مصفوفة `messages` تحتوي على سجل المحادثة بترتيب زمني
- يمكن أن تحتوي على رسائل متعددة بأدوار "user" و "assistant"
- لا داعي لإرسال رسائل بدور "system" من واجهة المستخدم

#### الاستجابة

استجابة متدفقة (streaming) من نوع text/plain، حيث يتم إرسال أجزاء من الرد تباعاً عند توفرها.

### 2. نقطة فحص الحالة - `/health`

تُستخدم للتحقق من حالة الخدمة وجاهزيتها.

- **الطريقة**: GET
- **الاستجابة**: "OK" (نص عادي)
- **رمز الحالة**: 200 إذا كانت الخدمة تعمل بشكل صحيح

## أمثلة الاستخدام

### إرسال طلب محادثة باستخدام JavaScript/Fetch API

```javascript
async function sendMessage(userMessage, conversationHistory = []) {
  // إضافة رسالة المستخدم الجديدة إلى المحادثة
  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];
  
  try {
    const response = await fetch('https://bayen.onrender.com/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
      throw new Error(`فشل الطلب: ${response.status}`);
    }
    
    // معالجة الاستجابة المتدفقة
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      result += chunk;
      
      // يمكن هنا عرض الأجزاء المستلمة في واجهة المستخدم بشكل تدريجي
      // updateUI(result); // دالة افتراضية لتحديث واجهة المستخدم
    }
    
    return result;
  } catch (error) {
    console.error('خطأ في إرسال الرسالة:', error);
    throw error;
  }
}
```

### إرسال طلب محادثة باستخدام Axios

```javascript
import axios from 'axios';

async function sendMessage(userMessage, conversationHistory = []) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];
  
  try {
    const response = await axios({
      method: 'post',
      url: 'https://bayen.onrender.com/chat',
      data: { messages },
      responseType: 'stream',
    });
    
    let result = '';
    
    // تعامل مع البيانات المتدفقة
    response.data.on('data', (chunk) => {
      const textChunk = chunk.toString();
      result += textChunk;
      
      // يمكن هنا عرض الأجزاء المستلمة في واجهة المستخدم بشكل تدريجي
      // updateUI(result); // دالة افتراضية لتحديث واجهة المستخدم
    });
    
    return new Promise((resolve, reject) => {
      response.data.on('end', () => resolve(result));
      response.data.on('error', reject);
    });
  } catch (error) {
    console.error('خطأ في إرسال الرسالة:', error);
    throw error;
  }
}
```

## إدارة المحادثة

لإدارة محادثة مستمرة، احتفظ بسجل المحادثة وأرسله مع كل طلب جديد:

```javascript
// مثال لإدارة المحادثة
let conversationHistory = [];

async function handleUserInput(userMessage) {
  try {
    // إرسال الرسالة والحصول على الرد
    const assistantResponse = await sendMessage(userMessage, conversationHistory);
    
    // تحديث سجل المحادثة
    conversationHistory.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantResponse }
    );
    
    return assistantResponse;
  } catch (error) {
    console.error('خطأ في معالجة رسالة المستخدم:', error);
    throw error;
  }
}
```

## التعامل مع الأخطاء

الخدمة قد ترجع رموز أخطاء HTTP في الحالات التالية:
- **400 Bad Request**: طلب غير صالح (مثل عدم وجود بيانات)
- **500 Internal Server Error**: خطأ داخلي في الخادم

تأكد من التعامل مع هذه الأخطاء بشكل مناسب في تطبيقك.

## اختبار الخدمة

للتحقق من أن الخدمة تعمل بشكل صحيح:

```bash
curl -X GET https://bayen.onrender.com/health
```

يجب أن ترجع "OK" إذا كانت الخدمة متاحة.

لاختبار إرسال رسالة:

```bash
curl -X POST https://bayen.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ما هي شروط عقد العمل في النظام السعودي؟"}]}'
```

ستبدأ الاستجابة المتدفقة بالظهور على الفور.

## ملاحظات هامة

1. المساعد مصمم للإجابة على الأسئلة القانونية المتعلقة بالقوانين والأنظمة السعودية
2. تأكد من توفير سياق كافٍ في الأسئلة لتلقي إجابات دقيقة
3. الخدمة تستخدم تقنية الاستجابة المتدفقة (streaming) لعرض الإجابات تدريجياً

---

## إعداد واجهة المستخدم (React Frontend)

هذا المشروع مبني باستخدام React ومكتبة `@assistant-ui/react`.

### المتطلبات الأساسية

- Node.js (يُفضل استخدام أحدث نسخة LTS)
- npm (يأتي مع Node.js)

### الإعداد

1. انتقل إلى دليل المشروع في Terminal:
   ```bash
   cd frontend
   ```

2. قم بتثبيت المكتبات المطلوبة:
   ```bash
   npm install
   ```

### تشغيل خادم التطوير

قم بتشغيل خادم التطوير:

```bash
npm start
```

سيبدأ خادم التطوير الخاص بـ React. افتح متصفحك وانتقل إلى `http://localhost:3000` لعرض التطبيق.

### البناء للإنتاج

لبناء المشروع إلى ملفات ثابتة:

```bash
npm run build
```

سيتم إنشاء مخرجات البناء في دليل `build`. يمكن استضافة هذه الملفات باستخدام أي خادم ملفات ثابت (مثل Nginx أو GitHub Pages).
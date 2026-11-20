const CACHE_NAME = 'athar-app-v8';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// 1. مرحلة التثبيت: حفظ الملفات الأساسية في الذاكرة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم فتح ذاكرة التخزين المؤقت وحفظ الملفات');
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('تحذير: فشل حفظ بعض الملفات (قد تكون غير موجودة):', err);
      });
    })
  );
  self.skipWaiting(); // تفعيل عامل الخدمة فوراً
});

// 2. مرحلة التنشيط: حذف نسخ الكاش القديمة لتوفير المساحة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('جاري حذف ذاكرة التخزين القديمة:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // السيطرة على جميع صفحات التطبيق المفتوحة
});

// 3. مرحلة اعتراض الطلبات: تقديم النسخة المحفوظة عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات غير GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إذا كان الملف موجوداً في الذاكرة، أرجعه فوراً (هذا ما يجعله يعمل أوفلاين)
      if (cachedResponse) {
        return cachedResponse;
      }

      // إذا لم يكن موجوداً، حاول جلبه من الإنترنت
      return fetch(event.request).then((networkResponse) => {
        // إذا نجح الجلب، احفظ نسخة منه في الذاكرة للاستخدام المستقبلي
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // إذا فشل الجلب (لا يوجد إنترنت)، قدم صفحة index.html كبديل
        if (event.request.mode === 'navigate' || 
           (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. الاستماع لأوامر التحديث من التطبيق
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

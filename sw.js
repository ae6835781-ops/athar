const CACHE_NAME = 'athar-offline-v7';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// 1. مرحلة التثبيت وحفظ الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم فتح ذاكرة التخزين المؤقت');
      // نستخدم Promise.all لضمان أن فشل ملف واحد لا يوقف حفظ باقي الملفات
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn('فشل حفظ ملف (قد يكون غير موجود):', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting(); // تفعيل عامل الخدمة فوراً
});

// 2. مرحلة التنشيط وحذف الذاكرة القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('جاري حذف الذاكرة القديمة:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. مرحلة اعتراض الطلبات وتقديم النسخة المحفوظة عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // إذا كان الملف موجوداً في الذاكرة، أرجعه فوراً (يعمل أوفلاين)
      if (response) {
        return response;
      }
      
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // إذا نجح الجلب من الإنترنت، احفظه في الذاكرة للاستخدام المستقبلي
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // إذا فشل الجلب (لا يوجد إنترنت)، قدم صفحة index.html كتطبيق بديل
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

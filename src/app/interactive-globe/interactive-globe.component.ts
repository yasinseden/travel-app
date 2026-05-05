import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Globe from 'globe.gl';
import { GlobeNavigationService } from './globe-navigation.service';
import { Subscription } from 'rxjs';
import { ALL_COUNTRIES } from './all-countries.data';

interface CountryItem {
  name: string;
  iso: string | null;
}

@Component({
  selector: 'app-interactive-globe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interactive-globe.component.html',
  styleUrl: './interactive-globe.component.scss'
})
export class InteractiveGlobeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('globeContainer', { static: true }) globeContainer!: ElementRef;
  private myGlobe: any;
  private navSubscription?: Subscription;

  // Renk paleti
  private colorPalette = ['#71f3b6ff', '#79e8d7ff', '#72caff', '#0f766e', '#43cf62ff', '#51d1d1ff', '#2af166ff', '#55ce7eff'];

  countriesList: CountryItem[] = [];
  isSidebarOpen: boolean = true; // Sidebar açık olarak başlar

  constructor(
    private navigationService: GlobeNavigationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.navSubscription = this.navigationService.focusLocation$.subscribe(coords => {
      if (this.myGlobe) {
        this.myGlobe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: coords.altitude || 1.2 }, 1500);
      }
    });
  }

  ngAfterViewInit() {
    // Angular DOM ve stillerin tam yüklenmesini beklemek için küçük bir gecikme
    setTimeout(() => {
      // Küreyi DOM elementine bağlama
      const GlobeFactory = (Globe as any).default || Globe;
      this.myGlobe = GlobeFactory()(this.globeContainer.nativeElement)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg') // Kaplama
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png') // Derinlik/yükselti
        .backgroundColor('rgba(0,0,0,0)') // Arka planı transparan yapıp CSS'ten kontrol edebilirsin
        .pointOfView({ altitude: 2.5 }, 4000); // Başlangıç animasyonu

      // Ülkelerin GeoJSON verisini çek ve küreye ekle
      fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
          // Küreyi çiz
          this.myGlobe.polygonsData(countries.features)
            .polygonAltitude(0.01)
            .polygonCapColor((d: any) => {
              const str = d.properties.ADMIN;
              let hash = 0;
              for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
              return this.colorPalette[Math.abs(hash) % this.colorPalette.length];
            })
            .polygonSideColor(() => 'rgba(0, 0, 0, 0.1)')
            .polygonStrokeColor(() => '#111')
            .polygonLabel((d: any) => `<b>${d.properties.ADMIN}</b>`)
            .onPolygonHover((hoverD: any) => {
              this.myGlobe
                .polygonAltitude((d: any) => d === hoverD ? 0.06 : 0.01)
                .polygonCapColor((d: any) => {
                  const str = d.properties.ADMIN;
                  let hash = 0;
                  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                  return d === hoverD ? '#DAFFFB' : this.colorPalette[Math.abs(hash) % this.colorPalette.length];
                });
            })
            .onPolygonClick((d: any) => {
              const countryName = d.properties.ADMIN;
              this.router.navigate(['/country', countryName]);
            });

          // GeoJSON isimlerinin statik listedeki karşılıkları (duplicate önleme)
          // key: GeoJSON'daki ADMIN ismi, value: statik listedeki eşleştirme
          const geoJsonToStaticAlias: Record<string, string> = {
            'Czechia': 'Czech Republic',
            'United Republic of Tanzania': 'Tanzania',
            'Republic of the Congo': 'Congo',
            'The Bahamas': 'Bahamas',
            'Ivory Coast': 'Ivory Coast',
            'East Timor': 'East Timor',
            'eSwatini': 'Eswatini',
            'Macedonia': 'North Macedonia',
            'Republic of Serbia': 'Serbia',
          };

          // GeoJSON'dan gelen ülke isimlerini + alias'larını bir Set'e al
          const geoJsonNames = new Set<string>();
          countries.features.forEach((f: any) => {
            const adminName = f.properties.ADMIN;
            geoJsonNames.add(adminName);
            // Alias varsa onu da ekle (statik listeden çıkması için)
            if (geoJsonToStaticAlias[adminName]) {
              geoJsonNames.add(geoJsonToStaticAlias[adminName]);
            }
          });

          // Sidebar'da göstermek istemediğimiz bölgeler
          const excludedRegions = new Set([
            'Antarctica', 'Northern Cyprus', 'Somaliland',
            'French Southern and Antarctic Lands', 'Falkland Islands',
            'Greenland', 'New Caledonia', 'Puerto Rico',
            'Western Sahara'
          ]);

          // GeoJSON'dan gelen ülkeleri listeye ekle (bölgeleri filtrele)
          const list: CountryItem[] = countries.features
            .filter((f: any) => !excludedRegions.has(f.properties.ADMIN))
            .map((f: any) => ({
              name: f.properties.ADMIN,
              iso: f.properties.ISO_A2 !== '-99' ? f.properties.ISO_A2 : null
            }));

          // ALL_COUNTRIES listesinden GeoJSON'da olmayanları ekle
          for (const country of ALL_COUNTRIES) {
            if (!geoJsonNames.has(country.name)) {
              list.push({ name: country.name, iso: country.iso });
            }
          }

          // Tüm listeyi sırala
          list.sort((a, b) => a.name.localeCompare(b.name));
          this.countriesList = list;

          this.cdr.detectChanges(); // Değişikliği Angular'a bildir
        });

      // Atmosfer parlaması (Glow effect)
      const globeMaterial = this.myGlobe.globeMaterial();
      if (globeMaterial) {
        globeMaterial.shininess = 0.5;
      }
    }, 50); // 50ms gecikme
  }

  onCountryClick(country: CountryItem) {
    this.router.navigate(['/country', country.name]);
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  ngOnDestroy() {
    if (this.navSubscription) {
      this.navSubscription.unsubscribe();
    }
    // Memory leak'leri önlemek için component yok edilirken render'ı temizle
    if (this.myGlobe && typeof this.myGlobe._destructor === 'function') {
      this.myGlobe._destructor();
    }
  }
}

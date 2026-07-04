import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WebSharedUi } from './web-shared-ui';

describe('WebSharedUi', () => {
  let component: WebSharedUi;
  let fixture: ComponentFixture<WebSharedUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebSharedUi],
    }).compileComponents();

    fixture = TestBed.createComponent(WebSharedUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
